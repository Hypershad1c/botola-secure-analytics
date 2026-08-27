import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { analyticsQuerySchema } from "@/services/api/contracts";
import { getPlayerAnalytics } from "@/services/api/gateway";
import { getRequestId, jsonError, jsonSuccess } from "@/services/api/http";

const paramsSchema = z.object({ playerId: z.string().uuid() });

type RouteContext = { params: Promise<{ playerId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    await requireApiPermission(request, "football.read");
    const { playerId } = paramsSchema.parse(await context.params);
    const query = analyticsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await getPlayerAnalytics(db, query.seasonId, playerId);
    return jsonSuccess(result.data, requestId, { cached: result.cached, methodologyVersion: result.methodologyVersion });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
