export const ML_FEATURE_SCHEMA_VERSION = "phase-6-v1";
export const ML_MODEL_KEY = "botola-match-outcome-baseline";

export const FEATURE_NAMES = [
  "home_form_points_5",
  "away_form_points_5",
  "home_attack_rate",
  "away_attack_rate",
  "home_defense_rate",
  "away_defense_rate",
  "home_elo",
  "away_elo",
  "home_home_strength",
  "away_away_strength",
  "home_recent_goals",
  "away_recent_goals",
  "home_recent_conceded",
  "away_recent_conceded",
  "h2h_home_points_rate",
  "h2h_matches",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export type FeatureVector = Record<FeatureName, number>;
export type Outcome = "HOME_WIN" | "DRAW" | "AWAY_WIN";

export type MatchTarget = {
  outcome: Outcome;
  homeGoals: number;
  awayGoals: number;
};

export type MatchFeatureRow = {
  matchId: string;
  seasonId: string;
  kickoffAt: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  features: FeatureVector;
  target: MatchTarget;
};

export type TrainingDataset = {
  featureSchemaVersion: string;
  rows: MatchFeatureRow[];
  datasetHash: string;
};

export type ModelMetrics = {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  logLoss: number;
  brierScore: number;
  calibrationError: number;
  evaluatedRows: number;
};

export type ModelArtifact = {
  modelKey: string;
  version: string;
  featureSchemaVersion: string;
  featureNames: readonly FeatureName[];
  outcomeWeights: number[][];
  outcomeBias: number[];
  homeGoalWeights: number[];
  homeGoalBias: number;
  awayGoalWeights: number[];
  awayGoalBias: number;
  hyperparameters: Record<string, number | string>;
  metrics: ModelMetrics;
  trainingDatasetHash: string;
};

export type Prediction = {
  modelKey: string;
  modelVersion: string;
  matchId?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  confidence: number;
  features: FeatureVector;
};
