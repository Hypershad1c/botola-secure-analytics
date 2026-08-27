import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { getCompletedMatchesForSeason } from "@/repositories/analytics.repository";
import { persistModelArtifact } from "@/repositories/ml.repository";
import { runMatchCsvPipeline } from "@/services/ingestion/pipeline";
import { persistPipelineResult } from "@/services/ingestion/persistence";
import { promoteAcceptedMatches } from "@/services/ingestion/promotion";
import { trainBaselineOutcomeModel } from "@/services/ml/training";
import { toJobPayload, type JobPayload } from "./queue";
import type { JobHandlers } from "./worker";

function requiredString(payload: JobPayload, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`Job payload field ${key} is required.`);
  return value;
}

function inputPathWithinWorkerRoot(inputPath: string): string {
  const root = resolve(process.env.WORKER_INPUT_ROOT ?? process.cwd());
  const candidate = resolve(root, inputPath);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) throw new Error("Job input path is outside WORKER_INPUT_ROOT.");
  return candidate;
}

export function createDefaultWorkerHandlers(db: PrismaClient): JobHandlers {
  return {
    INGESTION: async (job) => {
      const payload = toJobPayload(job.payload);
      const sourceCode = requiredString(payload, "sourceCode");
      const datasetName = requiredString(payload, "datasetName");
      const storageKey = requiredString(payload, "storageKey");
      const inputPath = inputPathWithinWorkerRoot(requiredString(payload, "inputPath"));
      const datasetVersion = typeof payload.datasetVersion === "string" ? payload.datasetVersion : undefined;
      const content = await readFile(inputPath);
      const pipeline = runMatchCsvPipeline(content, { sourceCode, datasetName, datasetVersion });
      const persisted = await persistPipelineResult(db, { sourceCode, datasetName, datasetVersion, storageKey, pipeline });
      await promoteAcceptedMatches(db, persisted.runId);
    },
    ML_TRAINING: async (job) => {
      const payload = toJobPayload(job.payload);
      const seasonId = requiredString(payload, "seasonId");
      const version = typeof payload.version === "string" ? payload.version : undefined;
      const artifactKey = typeof payload.artifactKey === "string" ? payload.artifactKey : undefined;
      const matches = await getCompletedMatchesForSeason(db, seasonId);
      if (matches.length === 0) throw new Error(`No completed matches available for season ${seasonId}.`);
      const trained = trainBaselineOutcomeModel(matches, { version });
      await persistModelArtifact(db, trained.artifact, artifactKey);
    },
  };
}
