-- Phase 8 durable observability sink
CREATE TYPE "ObservabilityEventKind" AS ENUM ('REQUEST', 'ERROR', 'ALERT');
CREATE TABLE "ObservabilityEvent" (
  "id" UUID NOT NULL,
  "kind" "ObservabilityEventKind" NOT NULL,
  "severity" "SecuritySeverity" NOT NULL DEFAULT 'INFO',
  "requestId" VARCHAR(128),
  "route" VARCHAR(240),
  "fingerprint" VARCHAR(128),
  "message" VARCHAR(500) NOT NULL,
  "context" JSONB,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ObservabilityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ObservabilityEvent_kind_occurredAt_idx" ON "ObservabilityEvent"("kind", "occurredAt");
CREATE INDEX "ObservabilityEvent_severity_occurredAt_idx" ON "ObservabilityEvent"("severity", "occurredAt");
CREATE INDEX "ObservabilityEvent_fingerprint_occurredAt_idx" ON "ObservabilityEvent"("fingerprint", "occurredAt");
CREATE TABLE "ObservabilityMetricSnapshot" (
  "id" UUID NOT NULL,
  "capturedAt" TIMESTAMPTZ(3) NOT NULL,
  "uptimeSeconds" INTEGER NOT NULL,
  "totalRequests" INTEGER NOT NULL,
  "errorRequests" INTEGER NOT NULL,
  "errorRate" DECIMAL(10,6) NOT NULL,
  "p95DurationMs" INTEGER NOT NULL,
  "totalErrors" INTEGER NOT NULL,
  "recentErrors" INTEGER NOT NULL,
  "byRoute" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ObservabilityMetricSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ObservabilityMetricSnapshot_capturedAt_idx" ON "ObservabilityMetricSnapshot"("capturedAt");
