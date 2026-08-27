import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";
import { captureError } from "@/services/observability/monitor";

export async function GET(request: Request) {
  return observeApiRequest(request, "/api/readiness", async (_observedRequest, requestId) => {
    const startedAt = performance.now();
    try {
      await db.$queryRaw`SELECT 1`;
      return jsonSuccess({ status: "ready", dependencies: { database: { status: "ok", durationMs: Math.round((performance.now() - startedAt) * 100) / 100 } } }, requestId);
    } catch (error) {
      captureError(error, { requestId, route: "/api/readiness", dependency: "database" });
      return NextResponse.json({ status: "not_ready", dependencies: { database: { status: "unavailable" } }, meta: { requestId } }, { status: 503, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
    }
  });
}
