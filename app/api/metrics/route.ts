import { NextResponse } from "next/server";
import { isObservabilityAuthorized } from "@/services/observability/access";
import { evaluateAlerts, getMetricSnapshot } from "@/services/observability/monitor";
import { persistMetricSnapshot, persistOperationalAlerts } from "@/services/observability/sink";
import { observeApiRequest } from "@/services/api/http";

export async function GET(request: Request) {
  return observeApiRequest(request, "/api/metrics", async (observedRequest, requestId) => {
    if (!isObservabilityAuthorized(observedRequest)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Observability access is required." }, meta: { requestId } }, { status: 403, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
    const snapshot = getMetricSnapshot();
    const alerts = evaluateAlerts(snapshot);
    persistMetricSnapshot(snapshot);
    persistOperationalAlerts(alerts, requestId);
    return NextResponse.json({ data: snapshot, alerts, meta: { requestId } }, { headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
  });
}
