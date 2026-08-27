import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { db } from "@/lib/db";
import { runMatchCsvPipeline } from "@/services/ingestion/pipeline";
import { persistPipelineResult } from "@/services/ingestion/persistence";
import { promoteAcceptedMatches } from "@/services/ingestion/promotion";

function argument(index: number, fallback?: string): string {
  const value = process.argv[index] ?? fallback;
  if (!value) throw new Error(`Missing argument at position ${index}.`);
  return value;
}

async function main() {
  const inputPath = resolve(argument(2));
  const sourceCode = argument(3, "manual");
  const datasetName = argument(4, basename(inputPath));
  const datasetVersion = process.argv[5];
  const storageKey = process.argv[6] ?? `local/${basename(inputPath)}`;
  const content = await readFile(inputPath);
  const pipeline = runMatchCsvPipeline(content, { sourceCode, datasetName, datasetVersion });
  const persisted = await persistPipelineResult(db, { sourceCode, datasetName, datasetVersion, storageKey, pipeline });
  const promotion = await promoteAcceptedMatches(db, persisted.runId);
  console.log(JSON.stringify({ report: pipeline.report, persisted, promotion }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
