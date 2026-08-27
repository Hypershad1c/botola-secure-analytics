import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { parseCsv, type CsvLimits } from "./csv";
import { normalizeMatchRecord } from "./normalizer";
import { validateAndClassify } from "./validator";
import type { IngestionReport, SourceRecord, ValidatedMatch } from "./types";

export type PipelineOptions = {
  sourceCode: string;
  datasetName: string;
  datasetVersion?: string;
  contentType?: string;
  csvLimits?: CsvLimits;
};

export type PipelineResult = {
  report: IngestionReport;
  records: ValidatedMatch[];
};

export function runMatchCsvPipeline(content: Buffer | string, options: PipelineOptions): PipelineResult {
  const body = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  const text = body.toString("utf8");
  const rows = parseCsv(text, options.csvLimits);
  const seenSourceIds = new Set<string>();
  const seenFingerprints = new Map<string, { homeScore: number | null; awayScore: number | null }>();
  const records: ValidatedMatch[] = [];
  const issuesByCode: Record<string, number> = {};
  let duplicates = 0;
  let conflicts = 0;
  let warnings = 0;

  rows.forEach((payload, index) => {
    const sourceRecord: SourceRecord = {
      sourceCode: options.sourceCode,
      datasetName: options.datasetName,
      datasetVersion: options.datasetVersion,
      sourceRecordId: payload.id || undefined,
      rowNumber: index + 2,
      payload,
    };
    const normalized = normalizeMatchRecord(sourceRecord);
    const classified = validateAndClassify(sourceRecord, normalized, seenSourceIds);
    if (sourceRecord.sourceRecordId) seenSourceIds.add(sourceRecord.sourceRecordId);
    for (const issue of classified.issues) issuesByCode[issue.code] = (issuesByCode[issue.code] ?? 0) + 1;
    warnings += normalized.warnings.length;
    const previous = seenFingerprints.get(normalized.fingerprint);
    if (previous && classified.status === "ACCEPTED") {
      const scoreConflict = previous.homeScore !== normalized.homeScore || previous.awayScore !== normalized.awayScore;
      classified.status = scoreConflict ? "CONFLICT" : "DUPLICATE";
      const issueCode = scoreConflict ? "CONFLICTING_DUPLICATE" : "DUPLICATE_SOURCE_RECORD";
      classified.issues.push({ code: issueCode, field: "fingerprint", message: scoreConflict ? "Match fingerprint has conflicting scores." : "Match fingerprint has already been accepted." });
      issuesByCode[issueCode] = (issuesByCode[issueCode] ?? 0) + 1;
    }
    if (classified.status === "ACCEPTED") seenFingerprints.set(normalized.fingerprint, { homeScore: normalized.homeScore, awayScore: normalized.awayScore });
    if (classified.status === "DUPLICATE") duplicates += 1;
    if (classified.status === "CONFLICT") conflicts += 1;
    records.push(classified);
  });

  const rejected = records.filter((record) => record.status === "REJECTED").length;
  const accepted = records.filter((record) => record.status === "ACCEPTED").length;
  const report: IngestionReport = {
    runId: randomUUID(),
    sourceCode: options.sourceCode,
    datasetName: options.datasetName,
    datasetVersion: options.datasetVersion,
    artifact: {
      sha256: createHash("sha256").update(body).digest("hex"),
      byteSize: body.byteLength,
      contentType: options.contentType ?? "text/csv",
    },
    recordsSeen: records.length,
    recordsAccepted: accepted,
    recordsRejected: rejected,
    duplicates,
    conflicts,
    warnings,
    issuesByCode,
    generatedAt: new Date().toISOString(),
  };
  return { report, records };
}
