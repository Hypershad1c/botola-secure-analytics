import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { db } from "@/lib/db";
import { parseOpenfootballText, runOpenfootballPipeline } from "@/services/ingestion/openfootball";
import { persistPipelineResult } from "@/services/ingestion/persistence";
import { promoteAcceptedMatches } from "@/services/ingestion/promotion";

const files = process.argv.slice(2).filter((value) => value !== "--persist");
const shouldPersist = process.argv.includes("--persist");

async function main() {
  if (files.length === 0) throw new Error("Usage: pnpm import:openfootball <file> [file ...] [--persist]");
  const summaries: unknown[] = [];
  for (const file of files) {
    const inputPath = resolve(file);
    const content = await readFile(inputPath);
    const parsed = parseOpenfootballText(content.toString("utf8"));
    const pipeline = runOpenfootballPipeline(content, { sourceCode: "openfootball-world", datasetName: `openfootball-morocco-${parsed.sourceSeason}`, datasetVersion: parsed.sourceSeason, contentType: "text/plain; charset=utf-8" });
    const summary: Record<string, unknown> = { file: inputPath, competition: parsed.competition, season: parsed.sourceSeason, report: pipeline.report };
    if (shouldPersist) {
      const persisted = await persistPipelineResult(db, { sourceCode: "openfootball-world", datasetName: `openfootball-morocco-${parsed.sourceSeason}`, datasetVersion: parsed.sourceSeason, storageKey: `openfootball/morocco/${basename(inputPath)}`, pipeline });
      summary.persistence = persisted;
      summary.promotion = await promoteAcceptedMatches(db, persisted.runId);
    }
    summaries.push(summary);
  }
  console.log(JSON.stringify({ mode: shouldPersist ? "persist" : "dry-run", summaries }, null, 2));
}

void main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
