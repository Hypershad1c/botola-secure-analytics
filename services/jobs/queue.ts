import type { Job, JobKind, JobStatus, Prisma, PrismaClient } from "@prisma/client";

export type JobPayload = Prisma.InputJsonObject;

export function toJobPayload(value: Prisma.JsonValue): JobPayload {
  if (value === null || Array.isArray(value) || typeof value !== "object") throw new Error("Job payload must be a JSON object.");
  return value as JobPayload;
}
export type QueueJob = Job;

export async function enqueueJob(
  db: PrismaClient,
  input: { kind: JobKind; idempotencyKey: string; payload: JobPayload; scheduledFor?: Date; maxAttempts?: number },
): Promise<QueueJob> {
  return db.job.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      kind: input.kind,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      scheduledFor: input.scheduledFor,
      maxAttempts: input.maxAttempts ?? 3,
    },
  });
}

export async function claimNextJob(db: PrismaClient, now = new Date()): Promise<QueueJob | null> {
  const candidate = await db.job.findFirst({
    where: { status: "QUEUED", scheduledFor: { lte: now } },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
  });
  if (!candidate) return null;
  const claimed = await db.job.updateMany({
    where: { id: candidate.id, status: "QUEUED" },
    data: { status: "RUNNING", attempts: { increment: 1 }, lockedAt: now, lastError: null },
  });
  if (claimed.count === 0) return claimNextJob(db, now);
  return db.job.findUnique({ where: { id: candidate.id } });
}

export async function markJobSucceeded(db: PrismaClient, jobId: string, completedAt = new Date()): Promise<void> {
  await db.job.update({ where: { id: jobId }, data: { status: "SUCCEEDED", completedAt, lockedAt: null, lastError: null } });
}

export async function markJobFailed(db: PrismaClient, job: QueueJob, error: unknown, failedAt = new Date()): Promise<JobStatus> {
  const message = error instanceof Error ? error.message : "Unknown worker failure";
  const nextStatus: JobStatus = job.attempts >= job.maxAttempts ? "DEAD_LETTER" : "QUEUED";
  await db.job.update({
    where: { id: job.id },
    data: {
      status: nextStatus,
      scheduledFor: nextStatus === "QUEUED" ? new Date(failedAt.getTime() + Math.min(job.attempts * 30_000, 15 * 60_000)) : failedAt,
      completedAt: nextStatus === "DEAD_LETTER" ? failedAt : null,
      lockedAt: null,
      lastError: message.slice(0, 2_000),
    },
  });
  return nextStatus;
}

export async function cancelJob(db: PrismaClient, jobId: string): Promise<void> {
  await db.job.updateMany({ where: { id: jobId, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "CANCELLED", completedAt: new Date(), lockedAt: null } });
}
