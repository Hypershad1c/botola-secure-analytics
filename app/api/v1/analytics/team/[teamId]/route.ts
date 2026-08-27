import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { analyticsQuerySchema } from "@/services/api/contracts";
import { getTeamAnalytics } from "@/services/api/gateway";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";

const paramsSchema = z.object({ teamId: z.string().uuid() });
type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return observeApiRequest(request, "/api/v1/analytics/team/:teamId", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "football.read");
    const { teamId } = paramsSchema.parse(await context.params);
    const query = analyticsQuerySchema.parse(Object.fromEntries(new URL(observedRequest.url).searchParams.entries()));
    const result = await getTeamAnalytics(db, query.seasonId, teamId);
    return jsonSuccess(result.data, requestId, { cached: result.cached, methodologyVersion: result.methodologyVersion });
  });
}
