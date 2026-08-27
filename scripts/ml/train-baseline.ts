import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CompletedMatch } from "@/services/analytics/types";
import { trainBaselineOutcomeModel } from "@/services/ml/training";

async function main() {
  const inputPath = resolve(process.argv[2] ?? "tests/fixtures/ml/completed-matches.json");
  const outputPath = resolve(process.argv[3] ?? "artifacts/botola-baseline-model.json");
  const raw = JSON.parse(await readFile(inputPath, "utf8")) as Array<Omit<CompletedMatch, "kickoffAt"> & { kickoffAt: string | null }>;
  const matches: CompletedMatch[] = raw.map((match) => ({ ...match, kickoffAt: match.kickoffAt ? new Date(match.kickoffAt) : null }));
  const result = trainBaselineOutcomeModel(matches);
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result.artifact, null, 2), "utf8");
  console.log(JSON.stringify({ outputPath, datasetHash: result.datasetHash, trainingRows: result.trainingRows, metrics: result.artifact.metrics }, null, 2));
}

void main();
