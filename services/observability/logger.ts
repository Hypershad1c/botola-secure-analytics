import { randomUUID } from "node:crypto";
import { getEnv } from "@/config/env";
import type { LogContext, LogLevel } from "./types";

const secretKeys = new Set(["authorization", "cookie", "set-cookie", "token", "password", "secret", "apiKey", "api_key", "DATABASE_URL"]);

export function log(level: LogLevel, message: string, context: LogContext = {}) {
  const runtimeEnv = safeEnv();
  const record = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: context.service ?? "botola-secure-analytics",
    environment: context.environment ?? runtimeEnv.NODE_ENV,
    ...(redact(context) as Record<string, unknown>),
  };
  if (level === "error") console.error(JSON.stringify(record));
  else if (level === "warn") console.warn(JSON.stringify(record));
  else console.log(JSON.stringify(record));
}

export function requestId(request: Request): string {
  return request.headers.get("x-request-id")?.slice(0, 128) || randomUUID();
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, secretKeys.has(key) || secretKeys.has(key.toLowerCase()) ? "[REDACTED]" : redact(nested)]));
}

function safeEnv() {
  try { return getEnv(); } catch { return { NODE_ENV: "production" as const }; }
}
