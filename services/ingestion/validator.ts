import { canonicalTeamName } from "./normalizer";
import type { NormalizedMatch, SourceRecord, ValidationIssue, ValidatedMatch } from "./types";

export type SourceMatch = {
  sourceRecordId?: string;
  competition: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  date?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
};

export function validateMatch(record: SourceMatch): ValidationIssue[] {
  const normalized: NormalizedMatch = {
    entityType: "match",
    sourceRecordId: record.sourceRecordId,
    rowNumber: 0,
    competition: record.competition,
    season: record.season,
    homeTeam: canonicalTeamName(record.homeTeam),
    awayTeam: canonicalTeamName(record.awayTeam),
    date: record.date ?? null,
    homeScore: record.homeScore ?? null,
    awayScore: record.awayScore ?? null,
    fingerprint: "",
    warnings: [],
  };
  return validateNormalizedMatch(normalized);
}

export function validateSourceRecord(record: SourceRecord): ValidationIssue[] {
  const requiredFields = ["competition", "season", "home_team", "away_team"];
  const issues: ValidationIssue[] = [];
  for (const field of requiredFields) {
    if (!record.payload[field]?.trim()) issues.push({ code: "MISSING_FIELD", field, message: `${field} is required.` });
  }
  for (const [field, value] of Object.entries(record.payload)) {
    if (value.length > 2_000) issues.push({ code: "FIELD_TOO_LONG", field, message: `${field} exceeds the maximum field length.` });
    if (/^[=+@]/.test(value.trim()) || (/^-/.test(value.trim()) && !/^-\d+(?:\.\d+)?$/.test(value.trim()))) issues.push({ code: "DANGEROUS_CELL", field, message: `${field} contains a formula-like value.` });
  }
  return issues;
}

export function validateNormalizedMatch(record: NormalizedMatch): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!record.competition) issues.push({ code: "INVALID_COMPETITION", field: "competition", message: "Competition is required." });
  if (!/^\d{4}\/\d{2}$/.test(record.season)) issues.push({ code: "INVALID_SEASON", field: "season", message: "Season must use YYYY/YY format." });
  if (!record.homeTeam || !record.awayTeam) issues.push({ code: "MISSING_FIELD", field: "team", message: "Both teams are required." });
  if (record.homeTeam === record.awayTeam) issues.push({ code: "SAME_TEAM", field: "away_team", message: "Home and away teams must differ." });
  for (const [field, score] of [["home_score", record.homeScore], ["away_score", record.awayScore]] as const) {
    if (score !== null && (!Number.isInteger(score) || score < 0)) issues.push({ code: "INVALID_SCORE", field, message: "Scores must be non-negative integers." });
  }
  if (record.date) {
    const date = new Date(record.date);
    const year = date.getUTCFullYear();
    if (Number.isNaN(date.getTime()) || year < 1900 || year > 2200) issues.push({ code: "INVALID_DATE", field: "date", message: "Date is outside the accepted range." });
  }
  return issues;
}

export function validateAndClassify(record: SourceRecord, normalized: NormalizedMatch, seenSourceIds: Set<string>): ValidatedMatch {
  const issues = [...validateSourceRecord(record), ...validateNormalizedMatch(normalized)];
  if (record.sourceRecordId && seenSourceIds.has(record.sourceRecordId)) {
    issues.push({ code: "DUPLICATE_SOURCE_RECORD", field: "id", message: "Source record ID has already been seen." });
  }
  const isDuplicate = issues.some((issue) => issue.code === "DUPLICATE_SOURCE_RECORD");
  return { record: normalized, issues, status: isDuplicate ? "DUPLICATE" : issues.length > 0 ? "REJECTED" : "ACCEPTED" };
}
