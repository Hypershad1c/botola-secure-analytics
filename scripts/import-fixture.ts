import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runMatchCsvPipeline } from "@/services/ingestion/pipeline";
import { renderIngestionReport } from "@/services/ingestion/report";

async function main() {
  const fixturePath = resolve(process.argv[2] ?? "tests/fixtures/footystats/matches.csv");
  const csv = await readFile(fixturePath);
  const result = runMatchCsvPipeline(csv, {
    sourceCode: "fixture",
    datasetName: "botola-pro-fixture",
    datasetVersion: "phase-2",
  });
  console.log(JSON.stringify(result.report, null, 2));
  console.log(renderIngestionReport(result.report));
}

void main();
