import { getEnv } from "@/config/env";

type JsonRecord = Record<string, unknown>;

async function main() {
  const runtimeEnv = getEnv();
  const appUrl = process.env.APP_URL ?? runtimeEnv.NEXT_PUBLIC_APP_URL;
  if (!appUrl || appUrl.includes("localhost")) throw new Error("APP_URL must point to a deployed application for production verification.");
  const base = appUrl.replace(/\/$/, "");
  const health = await getJson(`${base}/api/health`);
  assert(health.status === 200 && (health.body.data as JsonRecord | undefined)?.status === "ok", "Liveness check failed.");
  const readiness = await getJson(`${base}/api/readiness`);
  assert(readiness.status === 200 && readiness.body.status === "ready", "Readiness check failed.");
  const metrics = await getJson(`${base}/api/metrics`, runtimeEnv.OBSERVABILITY_TOKEN ? { Authorization: `Bearer ${runtimeEnv.OBSERVABILITY_TOKEN}` } : undefined);
  assert(metrics.status === 200 && metrics.body.data, "Protected metrics check failed.");
  const alerts = Array.isArray(metrics.body.alerts) ? metrics.body.alerts as Array<JsonRecord> : [];
  const critical = alerts.filter((alert) => alert.severity === "CRITICAL");
  assert(critical.length === 0, `Critical operational alerts detected: ${critical.map((alert) => alert.code).join(", ")}`);
  console.log(JSON.stringify({ status: "verified", appUrl: base, health: "ok", readiness: "ready", criticalAlerts: 0 }, null, 2));
}

async function getJson(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  return { status: response.status, body: await response.json() as JsonRecord };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
