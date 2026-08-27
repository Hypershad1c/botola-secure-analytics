import { db } from "@/lib/db";
import { getEnv } from "@/config/env";
import { hashSessionToken, sessionTokenFromRequest } from "./session";

export async function getCurrentUser(request: Request) {
  const runtimeEnv = getEnv();
  const token = sessionTokenFromRequest(request, runtimeEnv.AUTH_COOKIE_NAME);
  if (!token) return null;
  const session = await db.session.findFirst({
    where: { tokenHash: hashSessionToken(token, runtimeEnv.AUTH_SESSION_SECRET), revokedAt: null, expiresAt: { gt: new Date() }, user: { status: "ACTIVE" } },
    select: { id: true, expiresAt: true, user: { select: { id: true, email: true, displayName: true, status: true, roles: { select: { role: { select: { name: true, permissions: { where: { effect: "ALLOW" }, select: { permission: { select: { key: true } } } } } } } } } } },
  });
  if (!session) return null;
  return { sessionId: session.id, expiresAt: session.expiresAt, ...session.user, roles: session.user.roles.map((userRole) => ({ name: userRole.role.name, permissions: userRole.role.permissions.map((item) => item.permission.key) })) };
}
