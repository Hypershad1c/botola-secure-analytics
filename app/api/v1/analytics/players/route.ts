import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { analyticsQuerySchema } from "@/services/api/contracts";
import { listPlayerAnalytics } from "@/services/api/gateway";
import { getRequestId, jsonError, jsonSuccess } from "@/services/api/http";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireApiPermission(request, "football.read");
    const query = analyticsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await listPlayerAnalytics(db, query.seasonId, query.page, query.pageSize);
    return jsonSuccess(result.data, requestId, { cached: result.cached, methodologyVersion: result.methodologyVersion, pagination: result.pagination });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
