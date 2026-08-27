-- Phase 8 durable worker job queue
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED');
CREATE TYPE "JobKind" AS ENUM ('INGESTION', 'ML_TRAINING', 'PREDICTION_REFRESH');
CREATE TABLE "Job" (
  "id" UUID NOT NULL,
  "kind" "JobKind" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "scheduledFor" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "lastError" VARCHAR(2000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");
CREATE INDEX "Job_status_scheduledFor_idx" ON "Job"("status", "scheduledFor");
CREATE INDEX "Job_kind_createdAt_idx" ON "Job"("kind", "createdAt");
