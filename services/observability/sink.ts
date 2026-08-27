import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { log } from "./logger";
import type { ErrorEvent, MetricSnapshot, OperationalAlert } from "./types";

export type DurableEventInput = {
  kind: "REQUEST" | "ERROR" | "ALERT";
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requestId?: string;
  route?: string;
  fingerprint?: string;
  message: string;
  context?: Record<string, unknown>;
  occurredAt?: Date;
};

export interface ObservabilitySink {
  writeEvent(event: DurableEventInput): Promise<void>;
  writeSnapshot(snapshot: MetricSnapshot): Promise<void>;
}

class PrismaObservabilitySink implements ObservabilitySink {
  async writeEvent(event: DurableEventInput): Promise<void> {
    await db.observabilityEvent.create({
      data: {
        kind: event.kind,
        severity: event.severity ?? "INFO",
        requestId: event.requestId,
        route: event.route,
        fingerprint: event.fingerprint,
        message: event.message.slice(0, 500),
        context: event.context as Prisma.InputJsonObject | undefined,
        occurredAt: event.occurredAt,
      },
    });
  }

  async writeSnapshot(snapshot: MetricSnapshot): Promise<void> {
    await db.observabilityMetricSnapshot.create({
      data: {
        capturedAt: new Date(snapshot.capturedAt),
        uptimeSeconds: snapshot.uptimeSeconds,
        totalRequests: snapshot.requests.total,
        errorRequests: snapshot.requests.errors,
        errorRate: snapshot.requests.errorRate,
        p95DurationMs: snapshot.requests.p95DurationMs,
        totalErrors: snapshot.errors.total,
        recentErrors: snapshot.errors.lastHour,
        byRoute: snapshot.byRoute as Prisma.InputJsonObject,
      },
    });
  }
}

const sink: ObservabilitySink = new PrismaObservabilitySink();

function durableWritesConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL) && process.env.OBSERVABILITY_DURABLE !== "false";
}

export function persistErrorEvent(event: ErrorEvent): void {
  if (!durableWritesConfigured()) return;
  void sink.writeEvent({ kind: "ERROR", severity: "HIGH", requestId: event.requestId, route: event.route, fingerprint: event.fingerprint, message: event.message, context: { ...event.context, errorId: event.id, errorName: event.name, stack: event.stack } }).catch((error) => log("warn", "durable observability sink unavailable", { errorName: error instanceof Error ? error.name : "UnknownError", errorMessage: error instanceof Error ? error.message : "Unknown sink failure" }));
}

export function persistMetricSnapshot(snapshot: MetricSnapshot): void {
  if (!durableWritesConfigured()) return;
  void sink.writeSnapshot(snapshot).catch((error) => log("warn", "durable metric snapshot sink unavailable", { errorName: error instanceof Error ? error.name : "UnknownError", errorMessage: error instanceof Error ? error.message : "Unknown sink failure" }));
}

export function persistOperationalAlerts(alerts: OperationalAlert[], requestId?: string): void {
  if (!durableWritesConfigured()) return;
  for (const alert of alerts) {
    void sink.writeEvent({ kind: "ALERT", severity: alert.severity === "CRITICAL" ? "CRITICAL" : "LOW", requestId, message: alert.message, context: { code: alert.code, value: alert.value, threshold: alert.threshold, timestamp: alert.timestamp } }).catch((error) => log("warn", "durable alert sink unavailable", { errorName: error instanceof Error ? error.name : "UnknownError", errorMessage: error instanceof Error ? error.message : "Unknown sink failure" }));
  }
}
