-- Phase 6 ML model registry and prediction persistence
CREATE TYPE "ModelStatus" AS ENUM ('TRAINING', 'VALIDATED', 'PRODUCTION', 'RETIRED');
CREATE TYPE "PredictionTarget" AS ENUM ('MATCH_OUTCOME', 'HOME_GOALS', 'AWAY_GOALS');

CREATE TABLE "ModelVersion" (
  "id" UUID NOT NULL,
  "modelKey" VARCHAR(120) NOT NULL,
  "version" VARCHAR(80) NOT NULL,
  "status" "ModelStatus" NOT NULL DEFAULT 'TRAINING',
  "target" "PredictionTarget" NOT NULL,
  "featureSchemaVersion" VARCHAR(80) NOT NULL,
  "trainingDatasetHash" CHAR(64) NOT NULL,
  "hyperparameters" JSONB NOT NULL,
  "metrics" JSONB NOT NULL,
  "artifactKey" VARCHAR(500),
  "trainedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Prediction" (
  "id" UUID NOT NULL,
  "modelVersionId" UUID NOT NULL,
  "matchId" UUID,
  "seasonId" UUID,
  "homeTeamId" UUID NOT NULL,
  "awayTeamId" UUID NOT NULL,
  "homeWinProb" DECIMAL(8,6),
  "drawProb" DECIMAL(8,6),
  "awayWinProb" DECIMAL(8,6),
  "expectedHomeGoals" DECIMAL(8,4),
  "expectedAwayGoals" DECIMAL(8,4),
  "confidence" DECIMAL(8,6),
  "features" JSONB NOT NULL,
  "predictedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionResult" (
  "id" UUID NOT NULL,
  "predictionId" UUID NOT NULL,
  "actualOutcome" VARCHAR(32) NOT NULL,
  "actualHomeGoals" INTEGER,
  "actualAwayGoals" INTEGER,
  "correct" BOOLEAN,
  "evaluatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PredictionResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModelVersion_modelKey_version_key" ON "ModelVersion"("modelKey", "version");
CREATE INDEX "ModelVersion_status_target_idx" ON "ModelVersion"("status", "target");
CREATE INDEX "Prediction_modelVersionId_predictedAt_idx" ON "Prediction"("modelVersionId", "predictedAt");
CREATE INDEX "Prediction_seasonId_predictedAt_idx" ON "Prediction"("seasonId", "predictedAt");
CREATE INDEX "Prediction_matchId_idx" ON "Prediction"("matchId");
CREATE UNIQUE INDEX "PredictionResult_predictionId_key" ON "PredictionResult"("predictionId");

ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PredictionResult" ADD CONSTRAINT "PredictionResult_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
