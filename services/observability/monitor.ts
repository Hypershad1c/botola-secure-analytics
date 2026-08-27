import { createHash, randomUUID } from "node:crypto";
import { log, redact } from "./logger";
import type { ErrorEvent, LogContext, MetricSnapshot, OperationalAlert, RequestMetric } from "./types";

const startedAt = Date.now();
const requests: RequestMetric[] = [];
const errors: ErrorEvent[] = [];
const MAX_REQUESTS = 2_000;
const MAX_ERRORS = 500;
const ERROR_RATE_THRESHOLD = 0.05;
const P95_LATENCY_THRESHOLD_MS = 1_500;
const ERROR_BURST_THRESHOLD = 10;

export function recordRequest(metric: RequestMetric) {
  requests.push(metric);
  if (requests.length > MAX_REQUESTS) requests.shift();
  if (metric.statusCode >= 500 || metric.durationMs >= P95_LATENCY_THRESHOLD_MS) log("warn", "request threshold observed", metric);
}

export function captureError(error: unknown, context: LogContext = {}): ErrorEvent {
  const normalized = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
  const fingerprint = createHash("sha256").update(`${normalized.name}:${normalized.message}:${context.route ?? ""}`).digest("hex").slice(0, 16);
  const event: ErrorEvent = { id: randomUUID(), timestamp: new Date().toISOString(), requestId: context.requestId, route: context.route, name: normalized.name, message: normalized.message, stack: normalized.stack?.slice(0, 4_000), fingerprint, context: redact(context) as Record<string, unknown> };
  errors.push(event);
  if (errors.length > MAX_ERRORS) errors.shift();
  log("error", "application error captured", { ...context, errorId: event.id, fingerprint, errorName: event.name, errorMessage: event.message });
  return event;
}

export function getMetricSnapshot(now = Date.now()): MetricSnapshot {
  const recentErrors = errors.filter((event) => new Date(event.timestamp).getTime() >= now - 60 * 60 * 1_000);
  const errorCount = requests.filter((request) => request.statusCode >= 500).length;
  const snapshot: MetricSnapshot = {
    capturedAt: new Date(now).toISOString(),
    uptimeSeconds: Math.floor((now - startedAt) / 1_000),
    requests: { total: requests.length, errors: errorCount, errorRate: requests.length ? round(errorCount / requests.length) : 0, p95DurationMs: percentile(requests.map((request) => request.durationMs), 0.95) },
    byRoute: {},
    errors: { total: errors.length, lastHour: recentErrors.length, fingerprints: countFingerprints(recentErrors) },
  };
  for (const route of new Set(requests.map((request) => request.route))) {
    const routeRequests = requests.filter((request) => request.route === route);
    const routeErrors = routeRequests.filter((request) => request.statusCode >= 500).length;
    snapshot.byRoute[route] = { total: routeRequests.length, errors: routeErrors, errorRate: routeRequests.length ? round(routeErrors / routeRequests.length) : 0, p95DurationMs: percentile(routeRequests.map((request) => request.durationMs), 0.95) };
  }
  return snapshot;
}

export function evaluateAlerts(snapshot = getMetricSnapshot()): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  if (snapshot.requests.errorRate >= ERROR_RATE_THRESHOLD) alerts.push({ code: "HIGH_ERROR_RATE", severity: snapshot.requests.errorRate >= ERROR_RATE_THRESHOLD * 2 ? "CRITICAL" : "WARNING", message: "Application error rate exceeded the configured threshold.", value: snapshot.requests.errorRate, threshold: ERROR_RATE_THRESHOLD, timestamp: snapshot.capturedAt });
  if (snapshot.requests.p95DurationMs >= P95_LATENCY_THRESHOLD_MS) alerts.push({ code: "HIGH_LATENCY", severity: snapshot.requests.p95DurationMs >= P95_LATENCY_THRESHOLD_MS * 2 ? "CRITICAL" : "WARNING", message: "Request p95 latency exceeded the configured threshold.", value: snapshot.requests.p95DurationMs, threshold: P95_LATENCY_THRESHOLD_MS, timestamp: snapshot.capturedAt });
  if (snapshot.errors.lastHour >= ERROR_BURST_THRESHOLD) alerts.push({ code: "ERROR_BURST", severity: snapshot.errors.lastHour >= ERROR_BURST_THRESHOLD * 2 ? "CRITICAL" : "WARNING", message: "The application captured an unusual number of errors in the last hour.", value: snapshot.errors.lastHour, threshold: ERROR_BURST_THRESHOLD, timestamp: snapshot.capturedAt });
  return alerts;
}

export function resetMonitoringState() { requests.length = 0; errors.length = 0; }

function percentile(values: number[], percentileValue: number) { if (values.length === 0) return 0; const sorted = [...values].sort((left, right) => left - right); return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1)] ?? 0; }
function countFingerprints(events: ErrorEvent[]) { return events.reduce<Record<string, number>>((result, event) => { result[event.fingerprint] = (result[event.fingerprint] ?? 0) + 1; return result; }, {}); }
function round(value: number) { return Math.round(value * 10_000) / 10_000; }
