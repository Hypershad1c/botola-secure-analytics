import { requireApiPermission } from "@/lib/auth/api-auth";
import { db } from "@/lib/db";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";

export async function GET(request: Request) {
  return observeApiRequest(request, "/api/v1/data/quality", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "football.import");
    const [runs, conflicts] = await Promise.all([
      db.ingestionRun.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { source: { select: { code: true, name: true } }, _count: { select: { records: true, conflictRecords: true } } } }),
      db.dataConflict.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, entityType: true, fieldName: true, status: true, createdAt: true, ingestionRunId: true, canonicalId: true } }),
    ]);
    return jsonSuccess({ runs, conflicts }, requestId);
  });
}
