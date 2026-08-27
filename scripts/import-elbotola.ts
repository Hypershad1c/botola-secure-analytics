import { basename } from "node:path";
import { db } from "@/lib/db";
import { fetchElbotolaSeasonMatches, runElbotolaPipeline } from "@/services/ingestion/elbotola";
import { persistPipelineResult } from "@/services/ingestion/persistence";
import { promoteAcceptedMatches } from "@/services/ingestion/promotion";

const seasonId = process.argv[2];
const season = process.argv[3];
const shouldPersist = process.argv.includes("--persist");
const maxWeeksArg = process.argv.find((value) => value.startsWith("--max-weeks="));
const maxWeeks = maxWeeksArg ? Number(maxWeeksArg.slice("--max-weeks=".length)) : 30;

async function main() {
  if (!seasonId || !season || !/^\d{4}\/\d{2}$/.test(season)) throw new Error("Usage: pnpm import:elbotola <seasonId> <season YYYY/YY> [--max-weeks=N] [--persist]");
  const fetched = await fetchElbotolaSeasonMatches({ seasonId, maxWeeks });
  const pipeline = runElbotolaPipeline(fetched, { sourceCode: "elbotola-public", datasetName: `elbotola-morocco-botola-2-${season}`, datasetVersion: season, contentType: "application/json" });
  const summary: Record<string, unknown> = {
    mode: shouldPersist ? "persist" : "dry-run",
    source: "Elbotola public matches endpoint",
    endpointPattern: `https://m.elbotola.com/api/analytics/season/${seasonId}/matches?locale=en&week=N`,
    seasonId,
    season,
    weeksFetched: fetched.responses.length,
    matchesFetched: fetched.matches.length,
    report: pipeline.report,
  };
  if (shouldPersist) {
    const persisted = await persistPipelineResult(db, { sourceCode: "elbotola-public", datasetName: `elbotola-morocco-botola-2-${season}`, datasetVersion: season, storageKey: `elbotola/morocco/botola-2/${season}/season-${basename(seasonId)}.json`, pipeline });
    summary.persistence = persisted;
    summary.promotion = await promoteAcceptedMatches(db, persisted.runId, { countryCode: "MA", competitionType: "LEAGUE" });
  }
  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
