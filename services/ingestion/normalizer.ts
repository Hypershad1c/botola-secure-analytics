import type { NormalizedMatch, SourceRecord } from "./types";

export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

const teamAliases: Record<string, string> = {
  "raja ca": "raja casablanca",
  "raja club athletic": "raja casablanca",
  "wydad ac": "wydad casablanca",
  "wydad athletic club": "wydad casablanca",
};

export function canonicalTeamName(value: string): string {
  const normalized = normalizeName(value);
  return teamAliases[normalized] ?? normalized;
}

export function matchFingerprint(input: {
  competition: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  date?: string | null;
}): string {
  const date = input.date ? input.date.slice(0, 10) : "unknown-date";
  return [normalizeName(input.competition), input.season.trim(), canonicalTeamName(input.homeTeam), canonicalTeamName(input.awayTeam), date]
    .join("|");
}

export function normalizeMatchRecord(record: SourceRecord): NormalizedMatch {
  const row = record.payload;
  const homeTeam = canonicalTeamName(row.home_team ?? "");
  const awayTeam = canonicalTeamName(row.away_team ?? "");
  const date = parseOptionalDate(row.date);
  const homeScore = parseOptionalInteger(row.home_score);
  const awayScore = parseOptionalInteger(row.away_score);
  const warnings: string[] = [];
  if (!row.date) warnings.push("MISSING_MATCH_TIME");
  if (!row.home_score || !row.away_score) warnings.push("MISSING_SCORE");

  return {
    entityType: "match",
    sourceRecordId: record.sourceRecordId,
    rowNumber: record.rowNumber,
    competition: normalizeName(row.competition ?? ""),
    season: row.season?.trim() ?? "",
    homeTeam,
    awayTeam,
    date,
    homeScore,
    awayScore,
    fingerprint: matchFingerprint({ competition: row.competition ?? "", season: row.season ?? "", homeTeam, awayTeam, date }),
    warnings,
  };
}

function parseOptionalInteger(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
}

function parseOptionalDate(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.trim() : date.toISOString();
}
