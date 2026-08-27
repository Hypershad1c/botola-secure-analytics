import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { db } from "@/lib/db";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";

const querySchema = z.object({ seasonId: z.string().uuid().optional() });

export async function GET(request: Request) {
  return observeApiRequest(request, "/api/v1/predictions", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "football.read");
    const query = querySchema.parse(Object.fromEntries(new URL(observedRequest.url).searchParams));
    const predictions = await db.prediction.findMany({
      where: query.seasonId ? { seasonId: query.seasonId } : undefined,
      orderBy: { predictedAt: "desc" },
      take: 100,
      include: {
        modelVersion: { select: { modelKey: true, version: true, status: true, featureSchemaVersion: true, trainedAt: true } },
        result: true,
        match: { select: { kickoffAt: true, homeTeam: { select: { canonicalName: true, shortName: true } }, awayTeam: { select: { canonicalName: true, shortName: true } } } },
      },
    });
    return jsonSuccess(predictions, requestId);
  });
}
