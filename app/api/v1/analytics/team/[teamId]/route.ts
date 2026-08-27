import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { analyticsQuerySchema } from "@/services/api/contracts";
import { getTeamAnalytics } from "@/services/api/gateway";
import { getRequestId, jsonError, jsonSuccess } from "@/services/api/http";

const paramsSchema = z.object({ teamId: z.string().uuid() });

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    await requireApiPermission(request, "football.read");
    const { teamId } = paramsSchema.parse(await context.params);
    const query = analyticsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await getTeamAnalytics(db, query.seasonId, teamId);
    return jsonSuccess(result.data, requestId, { cached: result.cached, methodologyVersion: result.methodologyVersion });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
