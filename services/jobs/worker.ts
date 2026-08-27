import type { JobKind, PrismaClient } from "@prisma/client";
import { claimNextJob, markJobFailed, markJobSucceeded, type QueueJob } from "./queue";

export type JobHandler = (job: QueueJob) => Promise<void>;
export type JobHandlers = Partial<Record<JobKind, JobHandler>>;

export type WorkerRunResult =
  | { status: "idle" }
  | { status: "succeeded"; jobId: string; kind: JobKind }
  | { status: "failed" | "dead_letter"; jobId: string; kind: JobKind; error: string };

export async function runWorkerOnce(db: PrismaClient, handlers: JobHandlers, now = new Date()): Promise<WorkerRunResult> {
  const job = await claimNextJob(db, now);
  if (!job) return { status: "idle" };
  const handler = handlers[job.kind];
  if (!handler) {
    const error = `No handler registered for ${job.kind}`;
    const status = await markJobFailed(db, job, new Error(error), now);
    return { status: status === "DEAD_LETTER" ? "dead_letter" : "failed", jobId: job.id, kind: job.kind, error };
  }
  try {
    await handler(job);
    await markJobSucceeded(db, job.id, new Date());
    return { status: "succeeded", jobId: job.id, kind: job.kind };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker failure";
    const status = await markJobFailed(db, job, error);
    return { status: status === "DEAD_LETTER" ? "dead_letter" : "failed", jobId: job.id, kind: job.kind, error: message };
  }
}
