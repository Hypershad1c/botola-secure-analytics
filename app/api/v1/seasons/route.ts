import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";

export async function GET(request: Request) {
  return observeApiRequest(request, "/api/v1/seasons", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "football.read");
    const seasons = await db.season.findMany({
      where: { isCurrent: true },
      select: { id: true, name: true, isCurrent: true, competition: { select: { canonicalName: true, countryCode: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    return jsonSuccess(seasons, requestId);
  });
}
