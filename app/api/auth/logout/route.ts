import { getEnv } from "@/config/env";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/services/auth/current";
import { revokeSessionByToken, sessionTokenFromRequest } from "@/services/auth/session";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const user = await getCurrentUser(request);
  const runtimeEnv = getEnv();
  const token = sessionTokenFromRequest(request, runtimeEnv.AUTH_COOKIE_NAME);
  if (token) await revokeSessionByToken(token);
  if (user) await db.auditLog.create({ data: { actorUserId: user.id, action: "AUTH_LOGOUT", resourceType: "Session", resourceId: user.sessionId, requestId } });
  return Response.json({ data: { loggedOut: true }, meta: { requestId } }, { headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
}
