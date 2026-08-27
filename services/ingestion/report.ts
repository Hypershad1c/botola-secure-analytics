import type { IngestionReport } from "./types";

export function renderIngestionReport(report: IngestionReport): string {
  const issueRows = Object.entries(report.issuesByCode)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => `| ${code} | ${count} |`)
    .join("\n");
  return [
    `# Ingestion Report ${report.runId}`,
    "",
    `- Source: ${report.sourceCode}`,
    `- Dataset: ${report.datasetName}${report.datasetVersion ? ` (${report.datasetVersion})` : ""}`,
    `- Artifact SHA-256: ${report.artifact.sha256}`,
    `- Artifact bytes: ${report.artifact.byteSize}`,
    `- Generated: ${report.generatedAt}`,
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Records seen | ${report.recordsSeen} |`,
    `| Records accepted | ${report.recordsAccepted} |`,
    `| Records rejected | ${report.recordsRejected} |`,
    `| Duplicates | ${report.duplicates} |`,
    `| Conflicts | ${report.conflicts} |`,
    `| Warnings | ${report.warnings} |`,
    "",
    "## Issues by code",
    "",
    "| Code | Count |",
    "|---|---:|",
    issueRows || "| None | 0 |",
    "",
  ].join("\n");
}
