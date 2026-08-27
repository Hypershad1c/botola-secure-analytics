export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
  requestId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string;
  service?: string;
  environment?: string;
  [key: string]: unknown;
};

export type ErrorEvent = {
  id: string;
  timestamp: string;
  requestId?: string;
  route?: string;
  name: string;
  message: string;
  stack?: string;
  fingerprint: string;
  context: Record<string, unknown>;
};

export type RequestMetric = {
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
};

export type MetricSnapshot = {
  capturedAt: string;
  uptimeSeconds: number;
  requests: { total: number; errors: number; errorRate: number; p95DurationMs: number };
  byRoute: Record<string, { total: number; errors: number; errorRate: number; p95DurationMs: number }>;
  errors: { total: number; lastHour: number; fingerprints: Record<string, number> };
};

export type OperationalAlert = {
  code: "HIGH_ERROR_RATE" | "HIGH_LATENCY" | "READINESS_FAILURE" | "ERROR_BURST";
  severity: "WARNING" | "CRITICAL";
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
};
