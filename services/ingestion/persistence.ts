import type { PrismaClient } from "@prisma/client";
import type { PipelineResult } from "./pipeline";

export async function persistPipelineResult(
  db: PrismaClient,
  input: {
    sourceCode: string;
    datasetName: string;
    datasetVersion?: string;
    storageKey: string;
    pipeline: PipelineResult;
  },
) {
  const { report, records } = input.pipeline;
  return db.$transaction(async (tx) => {
    const source = await tx.dataSource.findUniqueOrThrow({ where: { code: input.sourceCode } });
    const artifact = await tx.rawArtifact.upsert({
      where: { sourceId_sha256: { sourceId: source.id, sha256: report.artifact.sha256 } },
      update: { storageKey: input.storageKey, byteSize: report.artifact.byteSize, contentType: report.artifact.contentType, retrievedAt: new Date() },
      create: { sourceId: source.id, storageKey: input.storageKey, byteSize: report.artifact.byteSize, contentType: report.artifact.contentType, sha256: report.artifact.sha256, retrievedAt: new Date() },
    });
    const run = await tx.ingestionRun.create({
      data: {
        sourceId: source.id,
        artifactId: artifact.id,
        status: report.recordsRejected > 0 || report.duplicates > 0 || report.conflicts > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
        datasetName: input.datasetName,
        datasetVersion: input.datasetVersion,
        startedAt: new Date(report.generatedAt),
        completedAt: new Date(),
        recordsSeen: report.recordsSeen,
        recordsParsed: report.recordsSeen,
        recordsAccepted: report.recordsAccepted,
        recordsRejected: report.recordsRejected,
        duplicates: report.duplicates,
        conflicts: report.conflicts,
        errorCount: Object.values(report.issuesByCode).reduce((sum, count) => sum + count, 0),
        errorSummary: report.issuesByCode,
        reportKey: `${input.storageKey}.report.json`,
      },
    });
    await tx.stagedRecord.createMany({
      data: records.map((record) => ({
        ingestionRunId: run.id,
        entityType: record.record.entityType,
        sourceRecordId: record.record.sourceRecordId,
        rowNumber: record.record.rowNumber,
        payload: record.record,
        normalized: record.record,
        status: record.status,
        validationErrors: record.issues,
      })),
    });
    const conflictRecords = records.filter((record) => record.status === "CONFLICT").flatMap((record) => record.issues
      .filter((issue) => issue.code === "CONFLICTING_DUPLICATE")
      .map((issue) => ({
        ingestionRunId: run.id,
        sourceId: source.id,
        entityType: record.record.entityType,
        fieldName: issue.field ?? "fingerprint",
        incomingValue: record.record,
        status: "OPEN" as const,
      })));
    if (conflictRecords.length > 0) await tx.dataConflict.createMany({ data: conflictRecords });
    return { runId: run.id, artifactId: artifact.id, report };
  });
}
