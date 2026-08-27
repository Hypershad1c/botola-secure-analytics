import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEnv } from "@/config/env";

export type ApiPrincipal = {
  userId: string;
  permissions: Set<string>;
};

export class ApiAuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
    this.name = "ApiAuthError";
  }
}

export async function requireApiPermission(request: Request, permission: string): Promise<ApiPrincipal> {
  const runtimeEnv = getEnv();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? getCookie(request, runtimeEnv.AUTH_COOKIE_NAME);
  if (!token || token.length < 16) throw new ApiAuthError(401, "Authentication required.");
  const tokenHash = createHmac("sha256", runtimeEnv.AUTH_SESSION_SECRET).update(token).digest("hex");
  const session = await db.session.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() }, user: { status: "ACTIVE" } },
    include: { user: { include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } },
  });
  if (!session) throw new ApiAuthError(401, "Authentication required.");
  const permissionKeys = new Set(session.user.roles.flatMap((userRole) => userRole.role.permissions.filter((item) => item.effect === "ALLOW").map((item) => item.permission.key)));
  if (!permissionKeys.has(permission) && !permissionKeys.has("admin.*")) throw new ApiAuthError(403, "Permission denied.");
  return { userId: session.userId, permissions: permissionKeys };
}

export function authErrorResponse(error: unknown, requestId: string): NextResponse {
  if (error instanceof ApiAuthError) return NextResponse.json({ error: { code: error.status === 401 ? "AUTH_REQUIRED" : "FORBIDDEN", message: error.message }, meta: { requestId } }, { status: error.status });
  return NextResponse.json({ error: { code: "AUTH_ERROR", message: "Authentication could not be completed." }, meta: { requestId } }, { status: 401 });
}

function getCookie(request: Request, cookieName: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  const pair = header.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${cookieName}=`));
  return pair ? decodeURIComponent(pair.slice(cookieName.length + 1)) : null;
}
