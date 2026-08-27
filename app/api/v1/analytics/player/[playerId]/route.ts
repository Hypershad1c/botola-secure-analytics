import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { analyticsQuerySchema } from "@/services/api/contracts";
import { getPlayerAnalytics } from "@/services/api/gateway";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";

const paramsSchema = z.object({ playerId: z.string().uuid() });
type RouteContext = { params: Promise<{ playerId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return observeApiRequest(request, "/api/v1/analytics/player/:playerId", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "football.read");
    const { playerId } = paramsSchema.parse(await context.params);
    const query = analyticsQuerySchema.parse(Object.fromEntries(new URL(observedRequest.url).searchParams.entries()));
    const result = await getPlayerAnalytics(db, query.seasonId, playerId);
    return jsonSuccess(result.data, requestId, { cached: result.cached, methodologyVersion: result.methodologyVersion });
  });
}
