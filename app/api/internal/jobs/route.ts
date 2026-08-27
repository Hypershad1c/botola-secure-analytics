import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { db } from "@/lib/db";
import { observeApiRequest, jsonSuccess } from "@/services/api/http";
import { enqueueJob } from "@/services/jobs/queue";

const jobRequestSchema = z.object({
  kind: z.enum(["INGESTION", "ML_TRAINING", "PREDICTION_REFRESH"]),
  idempotencyKey: z.string().trim().min(8).max(180),
  payload: z.record(z.string(), z.unknown()).default({}),
  scheduledFor: z.string().datetime().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
}).strict();

export async function POST(request: Request) {
  return observeApiRequest(request, "/api/internal/jobs", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "football.jobs");
    const body = jobRequestSchema.parse(await observedRequest.json());
    const job = await enqueueJob(db, {
      kind: body.kind,
      idempotencyKey: body.idempotencyKey,
      payload: body.payload as Prisma.InputJsonObject,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      maxAttempts: body.maxAttempts,
    });
    return jsonSuccess({ id: job.id, kind: job.kind, status: job.status, idempotencyKey: job.idempotencyKey, scheduledFor: job.scheduledFor }, requestId);
  });
}
