export type EntityType = "match" | "team" | "player" | "competition" | "season" | "standing";

export type SourceRecord = {
  sourceCode: string;
  datasetName: string;
  datasetVersion?: string;
  sourceRecordId?: string;
  rowNumber: number;
  payload: Record<string, string>;
};

export type NormalizedMatch = {
  entityType: "match";
  sourceRecordId?: string;
  rowNumber: number;
  competition: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  homeScore: number | null;
  awayScore: number | null;
  fingerprint: string;
  warnings: string[];
};

export type ValidationIssue = {
  code:
    | "MISSING_FIELD"
    | "FIELD_TOO_LONG"
    | "INVALID_SCORE"
    | "INVALID_DATE"
    | "SAME_TEAM"
    | "INVALID_SEASON"
    | "INVALID_COMPETITION"
    | "DANGEROUS_CELL"
    | "DUPLICATE_SOURCE_RECORD"
    | "CONFLICTING_DUPLICATE";
  field?: string;
  message: string;
};

export type ValidatedMatch = {
  record: NormalizedMatch;
  issues: ValidationIssue[];
  status: "ACCEPTED" | "REJECTED" | "DUPLICATE" | "CONFLICT";
};

export type IngestionReport = {
  runId: string;
  sourceCode: string;
  datasetName: string;
  datasetVersion?: string;
  artifact: {
    sha256: string;
    byteSize: number;
    contentType: string;
  };
  recordsSeen: number;
  recordsAccepted: number;
  recordsRejected: number;
  duplicates: number;
  conflicts: number;
  warnings: number;
  issuesByCode: Record<string, number>;
  generatedAt: string;
};
