import { describe, expect, it } from "vitest";
import { buildTrainingDataset, buildUpcomingFeatureVector } from "@/services/ml/features";
import { evaluateModel, predictMatch, splitTimeSeries, trainPredictionModel } from "@/services/ml/model";
import type { CompletedMatch } from "@/services/analytics/types";

const matches: CompletedMatch[] = Array.from({ length: 12 }, (_, index) => ({
  id: `m-${index + 1}`,
  seasonId: "season-1",
  kickoffAt: new Date(Date.UTC(2024, 0, index + 1)),
  homeTeamId: index % 2 === 0 ? "team-a" : "team-b",
  awayTeamId: index % 2 === 0 ? "team-b" : "team-a",
  homeScore: index % 3 === 0 ? 2 : index % 3 === 1 ? 1 : 0,
  awayScore: index % 3 === 0 ? 0 : index % 3 === 1 ? 1 : 1,
}));

describe("leakage-safe feature engineering", () => {
  it("uses only prior matches for the current row", () => {
    const baseline = buildTrainingDataset(matches);
    const changed = buildTrainingDataset(matches.map((match, index) => index === 0 ? { ...match, homeScore: 8, awayScore: 0 } : match));
    expect(baseline.rows[0]?.features).toEqual(changed.rows[0]?.features);
    expect(baseline.rows[0]?.target).not.toEqual(changed.rows[0]?.target);
    expect(baseline.rows[0]?.features.h2h_matches).toBe(0);
  });

  it("keeps validation rows strictly after training rows", () => {
    const dataset = buildTrainingDataset(matches);
    const split = splitTimeSeries(dataset.rows, 0.25);
    expect(split.train.at(-1)?.kickoffAt?.getTime()).toBeLessThan(split.validation[0]?.kickoffAt?.getTime() ?? Infinity);
  });

  it("builds an upcoming feature vector from history before kickoff", () => {
    const vector = buildUpcomingFeatureVector("team-a", "team-b", matches, new Date("2024-02-01T00:00:00Z"));
    expect(vector.home_elo).toBeGreaterThan(0);
    expect(vector.away_elo).toBeGreaterThan(0);
    expect(vector.h2h_matches).toBeGreaterThan(0);
  });
});

describe("baseline prediction model", () => {
  it("trains on chronological data and produces calibrated probability outputs", () => {
    const dataset = buildTrainingDataset(matches);
    const artifact = trainPredictionModel(dataset, { epochs: 80, learningRate: 0.02 });
    const prediction = predictMatch(artifact, { homeTeamId: "team-a", awayTeamId: "team-b", features: dataset.rows.at(-1)!.features });
    const total = prediction.homeWinProbability + prediction.drawProbability + prediction.awayWinProbability;
    expect(artifact.trainingDatasetHash).toBe(dataset.datasetHash);
    expect(artifact.metrics.evaluatedRows).toBeGreaterThan(0);
    expect(total).toBeCloseTo(1, 5);
    expect(prediction.expectedHomeGoals).toBeGreaterThanOrEqual(0);
    expect(prediction.expectedAwayGoals).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
  });

  it("evaluates a trained artifact without mutating it", () => {
    const dataset = buildTrainingDataset(matches);
    const artifact = trainPredictionModel(dataset, { epochs: 40 });
    const before = JSON.stringify(artifact);
    const metrics = evaluateModel(artifact, dataset.rows.slice(-3));
    expect(metrics.evaluatedRows).toBe(3);
    expect(JSON.stringify(artifact)).toBe(before);
  });
});
