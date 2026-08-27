import { FEATURE_NAMES, ML_FEATURE_SCHEMA_VERSION, ML_MODEL_KEY, type FeatureVector, type MatchFeatureRow, type ModelArtifact, type ModelMetrics, type Outcome, type Prediction, type TrainingDataset } from "./types";

const OUTCOMES: Outcome[] = ["HOME_WIN", "DRAW", "AWAY_WIN"];

type TrainingOptions = { learningRate?: number; epochs?: number; l2?: number; validationRatio?: number; version?: string };

export function splitTimeSeries(rows: MatchFeatureRow[], validationRatio = 0.2): { train: MatchFeatureRow[]; validation: MatchFeatureRow[] } {
  const ordered = [...rows].sort((left, right) => dateValue(left.kickoffAt) - dateValue(right.kickoffAt) || left.matchId.localeCompare(right.matchId));
  const validationCount = ordered.length < 5 ? 0 : Math.max(1, Math.floor(ordered.length * validationRatio));
  return { train: ordered.slice(0, ordered.length - validationCount), validation: ordered.slice(ordered.length - validationCount) };
}

export function trainPredictionModel(dataset: TrainingDataset, options: TrainingOptions = {}): ModelArtifact {
  if (dataset.rows.length < 3) throw new Error("At least three chronological rows are required to train a baseline model.");
  if (dataset.featureSchemaVersion !== ML_FEATURE_SCHEMA_VERSION) throw new Error("Unsupported feature schema version.");
  const learningRate = options.learningRate ?? 0.03;
  const epochs = options.epochs ?? 400;
  const l2 = options.l2 ?? 0.0001;
  const split = splitTimeSeries(dataset.rows, options.validationRatio ?? 0.2);
  const trainingRows = split.train.length >= 3 ? split.train : dataset.rows;
  const outcomeWeights = zeroMatrix(OUTCOMES.length, FEATURE_NAMES.length);
  const outcomeBias = new Array(OUTCOMES.length).fill(0);
  const homeGoalWeights = new Array(FEATURE_NAMES.length).fill(0);
  const awayGoalWeights = new Array(FEATURE_NAMES.length).fill(0);
  let homeGoalBias = Math.log(1.1);
  let awayGoalBias = Math.log(1.0);

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    for (const row of trainingRows) {
      const vector = vectorize(row.features);
      const probabilities = softmax(outcomeWeights.map((weights, index) => dot(weights, vector) + outcomeBias[index]));
      const actualClass = OUTCOMES.indexOf(row.target.outcome);
      for (let classIndex = 0; classIndex < OUTCOMES.length; classIndex += 1) {
        const error = probabilities[classIndex] - (classIndex === actualClass ? 1 : 0);
        for (let featureIndex = 0; featureIndex < vector.length; featureIndex += 1) outcomeWeights[classIndex][featureIndex] -= learningRate * (error * vector[featureIndex] + l2 * outcomeWeights[classIndex][featureIndex]);
        outcomeBias[classIndex] -= learningRate * error;
      }
      const homeLambda = Math.exp(clamp(dot(homeGoalWeights, vector) + homeGoalBias, -2, 2));
      const awayLambda = Math.exp(clamp(dot(awayGoalWeights, vector) + awayGoalBias, -2, 2));
      for (let featureIndex = 0; featureIndex < vector.length; featureIndex += 1) {
        homeGoalWeights[featureIndex] -= learningRate * ((homeLambda - row.target.homeGoals) * vector[featureIndex] + l2 * homeGoalWeights[featureIndex]);
        awayGoalWeights[featureIndex] -= learningRate * ((awayLambda - row.target.awayGoals) * vector[featureIndex] + l2 * awayGoalWeights[featureIndex]);
      }
      homeGoalBias -= learningRate * (homeLambda - row.target.homeGoals);
      awayGoalBias -= learningRate * (awayLambda - row.target.awayGoals);
    }
  }

  const artifact: ModelArtifact = {
    modelKey: ML_MODEL_KEY,
    version: options.version ?? `v1-${dataset.datasetHash.slice(0, 12)}`,
    featureSchemaVersion: dataset.featureSchemaVersion,
    featureNames: FEATURE_NAMES,
    outcomeWeights,
    outcomeBias,
    homeGoalWeights,
    homeGoalBias,
    awayGoalWeights,
    awayGoalBias,
    hyperparameters: { learningRate, epochs, l2, validationRatio: options.validationRatio ?? 0.2, split: "chronological" },
    metrics: evaluateModelInternal({
      modelKey: ML_MODEL_KEY,
      version: options.version ?? `v1-${dataset.datasetHash.slice(0, 12)}`,
      featureSchemaVersion: dataset.featureSchemaVersion,
      featureNames: FEATURE_NAMES,
      outcomeWeights,
      outcomeBias,
      homeGoalWeights,
      homeGoalBias,
      awayGoalWeights,
      awayGoalBias,
      hyperparameters: { learningRate, epochs, l2 },
      metrics: emptyMetrics(),
      trainingDatasetHash: dataset.datasetHash,
    }, split.validation.length > 0 ? split.validation : trainingRows),
    trainingDatasetHash: dataset.datasetHash,
  };
  return artifact;
}

export function predictMatch(artifact: ModelArtifact, input: { matchId?: string; homeTeamId: string; awayTeamId: string; features: FeatureVector }): Prediction {
  if (artifact.featureSchemaVersion !== ML_FEATURE_SCHEMA_VERSION) throw new Error("Model feature schema does not match the prediction feature schema.");
  const vector = vectorize(input.features);
  const probabilities = softmax(artifact.outcomeWeights.map((weights, index) => dot(weights, vector) + artifact.outcomeBias[index]));
  const expectedHomeGoals = round(Math.exp(clamp(dot(artifact.homeGoalWeights, vector) + artifact.homeGoalBias, -2, 2)));
  const expectedAwayGoals = round(Math.exp(clamp(dot(artifact.awayGoalWeights, vector) + artifact.awayGoalBias, -2, 2)));
  const confidence = round(Math.max(...probabilities));
  return {
    modelKey: artifact.modelKey,
    modelVersion: artifact.version,
    matchId: input.matchId,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    homeWinProbability: round(probabilities[0]),
    drawProbability: round(probabilities[1]),
    awayWinProbability: round(probabilities[2]),
    expectedHomeGoals,
    expectedAwayGoals,
    confidence,
    features: input.features,
  };
}

export function evaluateModel(artifact: ModelArtifact, rows: MatchFeatureRow[]): ModelMetrics {
  return evaluateModelInternal(artifact, rows);
}

function evaluateModelInternal(artifact: ModelArtifact, rows: MatchFeatureRow[]): ModelMetrics {
  if (rows.length === 0) return emptyMetrics();
  let correct = 0;
  let logLoss = 0;
  let brier = 0;
  let calibrationError = 0;
  const confusion = zeroMatrix(OUTCOMES.length, OUTCOMES.length);
  const calibrationBins = Array.from({ length: 5 }, () => ({ count: 0, confidence: 0, correct: 0 }));
  for (const row of rows) {
    const prediction = predictMatch(artifact, { homeTeamId: row.homeTeamId, awayTeamId: row.awayTeamId, features: row.features });
    const probabilities = [prediction.homeWinProbability, prediction.drawProbability, prediction.awayWinProbability];
    const actualIndex = OUTCOMES.indexOf(row.target.outcome);
    const predictedIndex = probabilities.indexOf(Math.max(...probabilities));
    confusion[actualIndex][predictedIndex] += 1;
    if (predictedIndex === actualIndex) correct += 1;
    logLoss += -Math.log(Math.max(probabilities[actualIndex], 1e-12));
    brier += probabilities.reduce((sum, probability, index) => sum + (probability - (index === actualIndex ? 1 : 0)) ** 2, 0);
    const bin = calibrationBins[Math.min(4, Math.floor(Math.max(...probabilities) * 5))];
    bin.count += 1;
    bin.confidence += Math.max(...probabilities);
    bin.correct += predictedIndex === actualIndex ? 1 : 0;
  }
  for (const bin of calibrationBins) if (bin.count > 0) calibrationError += (bin.count / rows.length) * Math.abs(bin.confidence / bin.count - bin.correct / bin.count);
  const precision = OUTCOMES.map((_, index) => metricPrecision(confusion, index));
  const recall = OUTCOMES.map((_, index) => metricRecall(confusion, index));
  const macroPrecision = mean(precision);
  const macroRecall = mean(recall);
  return {
    accuracy: round(correct / rows.length),
    macroPrecision: round(macroPrecision),
    macroRecall: round(macroRecall),
    macroF1: round(precision.reduce((sum, value, index) => sum + (value + recall[index] === 0 ? 0 : 2 * value * recall[index] / (value + recall[index])), 0) / OUTCOMES.length),
    logLoss: round(logLoss / rows.length),
    brierScore: round(brier / rows.length),
    calibrationError: round(calibrationError),
    evaluatedRows: rows.length,
  };
}

function vectorize(features: FeatureVector): number[] { return FEATURE_NAMES.map((name) => features[name]); }
function dot(left: number[], right: number[]) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function softmax(values: number[]) { const max = Math.max(...values); const exps = values.map((value) => Math.exp(value - max)); const total = exps.reduce((sum, value) => sum + value, 0); return exps.map((value) => value / total); }
function zeroMatrix(rows: number, columns: number) { return Array.from({ length: rows }, () => new Array(columns).fill(0)); }
function emptyMetrics(): ModelMetrics { return { accuracy: 0, macroPrecision: 0, macroRecall: 0, macroF1: 0, logLoss: 0, brierScore: 0, calibrationError: 0, evaluatedRows: 0 }; }
function metricPrecision(matrix: number[][], index: number) { const predicted = matrix.reduce((sum, row) => sum + row[index], 0); return predicted === 0 ? 0 : matrix[index][index] / predicted; }
function metricRecall(matrix: number[][], index: number) { const actual = matrix[index].reduce((sum, value) => sum + value, 0); return actual === 0 ? 0 : matrix[index][index] / actual; }
function mean(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function round(value: number) { return Math.round(value * 1_000_000) / 1_000_000; }
function dateValue(date: Date | null) { return date?.getTime() ?? Number.MAX_SAFE_INTEGER; }
