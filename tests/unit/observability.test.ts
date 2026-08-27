import { afterEach, describe, expect, it } from "vitest";
import { redact } from "@/services/observability/logger";
import { captureError, evaluateAlerts, getMetricSnapshot, recordRequest, resetMonitoringState } from "@/services/observability/monitor";

afterEach(() => resetMonitoringState());

describe("structured observability", () => {
  it("redacts nested credential-bearing values", () => {
    expect(redact({ authorization: "Bearer secret", nested: { password: "hidden", safe: "visible" } })).toEqual({ authorization: "[REDACTED]", nested: { password: "[REDACTED]", safe: "visible" } });
  });

  it("records request metrics and calculates p95 latency", () => {
    for (let index = 1; index <= 20; index += 1) recordRequest({ route: "/api/test", method: "GET", statusCode: index === 20 ? 500 : 200, durationMs: index * 10, timestamp: new Date().toISOString() });
    const snapshot = getMetricSnapshot();
    expect(snapshot.requests.total).toBe(20);
    expect(snapshot.requests.errors).toBe(1);
    expect(snapshot.requests.p95DurationMs).toBe(190);
    expect(snapshot.byRoute["/api/test"]?.errorRate).toBe(0.05);
  });

  it("redacts retained error context while capturing stable fingerprints", () => {
    const event = captureError(new Error("request failed"), { authorization: "Bearer secret", route: "/api/test" });
    expect(event.context.authorization).toBe("[REDACTED]");
  });

  it("captures stable error fingerprints and raises threshold alerts", () => {
    for (let index = 0; index < 12; index += 1) {
      captureError(new Error("database unavailable"), { route: "/api/readiness", requestId: `request-${index}` });
      recordRequest({ route: "/api/readiness", method: "GET", statusCode: 500, durationMs: 2_000, timestamp: new Date().toISOString() });
    }
    const snapshot = getMetricSnapshot();
    const alerts = evaluateAlerts(snapshot);
    expect(snapshot.errors.lastHour).toBe(12);
    expect(Object.keys(snapshot.errors.fingerprints)).toHaveLength(1);
    expect(alerts.map((alert) => alert.code)).toEqual(expect.arrayContaining(["HIGH_ERROR_RATE", "HIGH_LATENCY", "ERROR_BURST"]));
  });
});
