import { describe, expect, it } from "vitest";
import { calculateEloRatings, calculatePlayerSeasonMetrics, calculateTeamSeasonMetrics, toTeamMatchResults } from "@/services/analytics/metrics";
import type { CompletedMatch } from "@/services/analytics/types";

const matches: CompletedMatch[] = [
  { id: "m1", seasonId: "s1", kickoffAt: new Date("2024-08-01T20:00:00Z"), homeTeamId: "a", awayTeamId: "b", homeScore: 2, awayScore: 0 },
  { id: "m2", seasonId: "s1", kickoffAt: new Date("2024-08-08T20:00:00Z"), homeTeamId: "b", awayTeamId: "a", homeScore: 1, awayScore: 1 },
  { id: "m3", seasonId: "s1", kickoffAt: new Date("2024-08-15T20:00:00Z"), homeTeamId: "a", awayTeamId: "b", homeScore: 0, awayScore: 1 },
];

describe("team analytics metrics", () => {
  it("calculates results, splits, form, clean sheets, and BTTS", () => {
    const metrics = calculateTeamSeasonMetrics("s1", "a", matches, calculateEloRatings(matches));
    expect(metrics.matches).toBe(3);
    expect(metrics.wins).toBe(1);
    expect(metrics.draws).toBe(1);
    expect(metrics.losses).toBe(1);
    expect(metrics.points).toBe(4);
    expect(metrics.home.matches).toBe(2);
    expect(metrics.away.matches).toBe(1);
    expect(metrics.form5).toBe("WDL");
    expect(metrics.cleanSheets).toBe(1);
    expect(metrics.bttsMatches).toBe(1);
    expect(metrics.methodologyVersion).toBe("phase-3-v1");
  });

  it("updates Elo ratings deterministically in chronological order", () => {
    const ratings = calculateEloRatings(matches);
    expect(ratings.get("a")).not.toBe(1500);
    expect(ratings.get("b")).not.toBe(1500);
    expect(calculateEloRatings(matches)).toEqual(ratings);
  });

  it("returns no momentum when fewer than six results exist", () => {
    const metrics = calculateTeamSeasonMetrics("s1", "a", matches);
    expect(metrics.momentum).toBeNull();
  });

  it("preserves chronological result order", () => {
    expect(toTeamMatchResults(matches).filter((result) => result.teamId === "a").map((result) => result.result)).toEqual(["W", "D", "L"]);
  });
});

describe("player analytics metrics", () => {
  it("calculates totals and per-90 metrics only when minutes exist", () => {
    const metrics = calculatePlayerSeasonMetrics("s1", [
      { matchId: "m1", playerId: "p1", teamId: "a", minutes: 90, goals: 1, assists: 1, xg: 0.5, xa: 0.2 },
      { matchId: "m2", playerId: "p1", teamId: "a", minutes: 45, goals: 0, assists: 1, xg: null, xa: null },
      { matchId: "m3", playerId: "p2", teamId: "a", minutes: null, goals: 1, assists: null, xg: null, xa: null },
    ]);
    expect(metrics.find((metric) => metric.playerId === "p1")).toMatchObject({ minutes: 135, goals: 1, assists: 2, goalsPer90: 0.67, assistsPer90: 1.33, xg: 0.5 });
    expect(metrics.find((metric) => metric.playerId === "p2")?.goalsPer90).toBeNull();
  });
});
