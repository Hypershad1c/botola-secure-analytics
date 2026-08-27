import type { PrismaClient } from "@prisma/client";
import type { ModelArtifact, Prediction } from "@/services/ml/types";

export async function persistModelArtifact(db: PrismaClient, artifact: ModelArtifact, artifactKey?: string) {
  return db.modelVersion.upsert({
    where: { modelKey_version: { modelKey: artifact.modelKey, version: artifact.version } },
    update: {
      status: "VALIDATED",
      featureSchemaVersion: artifact.featureSchemaVersion,
      trainingDatasetHash: artifact.trainingDatasetHash,
      hyperparameters: artifact.hyperparameters,
      metrics: artifact.metrics,
      artifactKey,
      trainedAt: new Date(),
    },
    create: {
      modelKey: artifact.modelKey,
      version: artifact.version,
      status: "VALIDATED",
      target: "MATCH_OUTCOME",
      featureSchemaVersion: artifact.featureSchemaVersion,
      trainingDatasetHash: artifact.trainingDatasetHash,
      hyperparameters: artifact.hyperparameters,
      metrics: artifact.metrics,
      artifactKey,
      trainedAt: new Date(),
    },
  });
}

export async function persistPrediction(db: PrismaClient, modelVersionId: string, prediction: Prediction, seasonId?: string) {
  return db.prediction.create({
    data: {
      modelVersionId,
      matchId: prediction.matchId,
      seasonId,
      homeTeamId: prediction.homeTeamId,
      awayTeamId: prediction.awayTeamId,
      homeWinProb: prediction.homeWinProbability,
      drawProb: prediction.drawProbability,
      awayWinProb: prediction.awayWinProbability,
      expectedHomeGoals: prediction.expectedHomeGoals,
      expectedAwayGoals: prediction.expectedAwayGoals,
      confidence: prediction.confidence,
      features: prediction.features,
    },
  });
}
