import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCsv } from "@/services/ingestion/csv";
import { matchFingerprint } from "@/services/ingestion/normalizer";
import { validateMatch } from "@/services/ingestion/validator";

async function main() {
  const fixturePath = resolve(process.argv[2] ?? "tests/fixtures/footystats/matches.csv");
  const csv = await readFile(fixturePath, "utf8");
  const rows = parseCsv(csv);
  const fingerprints = new Set<string>();
  let duplicates = 0;
  let rejected = 0;

  for (const row of rows) {
    const record = {
      sourceRecordId: row.id,
      competition: row.competition,
      season: row.season,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      date: row.date || null,
      homeScore: row.home_score === "" ? null : Number(row.home_score),
      awayScore: row.away_score === "" ? null : Number(row.away_score),
    };
    const fingerprint = matchFingerprint(record);
    if (fingerprints.has(fingerprint)) duplicates += 1;
    fingerprints.add(fingerprint);
    if (validateMatch(record).length > 0) rejected += 1;
  }

  console.log(JSON.stringify({
    fixture: fixturePath,
    recordsSeen: rows.length,
    recordsAccepted: rows.length - rejected,
    duplicates,
    rejected,
  }, null, 2));
}

void main();
