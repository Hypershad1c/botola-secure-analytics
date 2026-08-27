import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { analyticsQuerySchema } from "@/services/api/contracts";
import { listTeamAnalytics } from "@/services/api/gateway";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";

export async function GET(request: Request) {
  return observeApiRequest(request, "/api/v1/analytics/season", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "football.read");
    const query = analyticsQuerySchema.parse(Object.fromEntries(new URL(observedRequest.url).searchParams.entries()));
    const result = await listTeamAnalytics(db, query.seasonId, query.page, query.pageSize);
    return jsonSuccess(result.data, requestId, { cached: result.cached, methodologyVersion: result.methodologyVersion, pagination: result.pagination });
  });
}
