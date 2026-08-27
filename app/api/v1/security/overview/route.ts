import { requireApiPermission } from "@/lib/auth/api-auth";
import { db } from "@/lib/db";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";

export async function GET(request: Request) {
  return observeApiRequest(request, "/api/v1/security/overview", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "security.read");
    const [events, alerts, snapshot] = await Promise.all([
      db.securityEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 30, select: { id: true, type: true, severity: true, requestId: true, route: true, occurredAt: true } }),
      db.securityAlert.findMany({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, description: true, severity: true, status: true, createdAt: true } }),
      db.observabilityMetricSnapshot.findFirst({ orderBy: { capturedAt: "desc" }, select: { capturedAt: true, totalRequests: true, errorRequests: true, errorRate: true, p95DurationMs: true, totalErrors: true, recentErrors: true } }),
    ]);
    return jsonSuccess({ events, alerts, snapshot }, requestId);
  });
}
