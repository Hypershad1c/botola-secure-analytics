import type { CompletedMatch } from "@/services/analytics/types";
import { buildTrainingDataset } from "./features";
import { trainPredictionModel } from "./model";
import type { ModelArtifact } from "./types";

export function trainBaselineOutcomeModel(matches: CompletedMatch[], options?: { version?: string }): { artifact: ModelArtifact; datasetHash: string; trainingRows: number } {
  const dataset = buildTrainingDataset(matches);
  const artifact = trainPredictionModel(dataset, options);
  return { artifact, datasetHash: dataset.datasetHash, trainingRows: dataset.rows.length };
}
