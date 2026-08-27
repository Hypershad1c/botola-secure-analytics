import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { claimNextJob, enqueueJob, markJobFailed } from "@/services/jobs/queue";

type FakeJob = {
  id: string;
  kind: "INGESTION";
  status: "QUEUED" | "RUNNING";
  idempotencyKey: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  lockedAt: Date | null;
  completedAt: Date | null;
  lastError: string | null;
};

function fakeDb(job: FakeJob) {
  const update = vi.fn(async ({ data }: { data: Partial<FakeJob> }) => Object.assign(job, data));
  const db = {
    job: {
      upsert: vi.fn(async ({ create }: { create: FakeJob }) => create),
      findFirst: vi.fn(async () => job.status === "QUEUED" ? job : null),
      updateMany: vi.fn(async () => { job.status = "RUNNING"; job.attempts += 1; return { count: 1 }; }),
      findUnique: vi.fn(async () => job),
      update,
    },
  };
  return { db: db as unknown as PrismaClient, update };
}

function makeJob(overrides: Partial<FakeJob> = {}): FakeJob {
  return { id: "job-1", kind: "INGESTION", status: "QUEUED", idempotencyKey: "ingest-2026-08-27", payload: {}, attempts: 0, maxAttempts: 3, scheduledFor: new Date(0), lockedAt: null, completedAt: null, lastError: null, ...overrides };
}

describe("durable job queue", () => {
  it("enqueues with an idempotency key", async () => {
    const { db } = fakeDb(makeJob());
    const job = await enqueueJob(db, { kind: "INGESTION", idempotencyKey: "ingest-2026-08-27", payload: { source: "footystats" } });
    expect(job.idempotencyKey).toBe("ingest-2026-08-27");
    expect(db.job.upsert).toHaveBeenCalledOnce();
  });

  it("claims one queued job and increments attempts", async () => {
    const job = makeJob();
    const { db } = fakeDb(job);
    const claimed = await claimNextJob(db, new Date(1_000));
    expect(claimed?.status).toBe("RUNNING");
    expect(claimed?.attempts).toBe(1);
  });

  it("requeues failures before the attempt limit", async () => {
    const job = makeJob({ status: "RUNNING", attempts: 1 });
    const { db, update } = fakeDb(job);
    const status = await markJobFailed(db, job as never, new Error("temporary source outage"), new Date(60_000));
    expect(status).toBe("QUEUED");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "QUEUED" }) }));
  });

  it("moves exhausted jobs to the dead-letter state", async () => {
    const job = makeJob({ status: "RUNNING", attempts: 3, maxAttempts: 3 });
    const { db } = fakeDb(job);
    const status = await markJobFailed(db, job as never, new Error("permanent failure"));
    expect(status).toBe("DEAD_LETTER");
  });
});
