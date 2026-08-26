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

export type ValidationIssue = {
  code: "MISSING_TEAM" | "INVALID_SCORE" | "INVALID_DATE" | "SAME_TEAM";
  message: string;
};

export function validateMatch(record: SourceMatch): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!record.homeTeam.trim() || !record.awayTeam.trim()) {
    issues.push({ code: "MISSING_TEAM", message: "Both home and away teams are required." });
  }
  if (record.homeTeam.trim().toLocaleLowerCase() === record.awayTeam.trim().toLocaleLowerCase()) {
    issues.push({ code: "SAME_TEAM", message: "Home and away teams must be different." });
  }
  for (const score of [record.homeScore, record.awayScore]) {
    if (score !== null && score !== undefined && (!Number.isInteger(score) || score < 0)) {
      issues.push({ code: "INVALID_SCORE", message: "Scores must be non-negative integers." });
    }
  }
  if (record.date && Number.isNaN(Date.parse(record.date))) {
    issues.push({ code: "INVALID_DATE", message: "The match date is not parseable." });
  }
  return issues;
}
