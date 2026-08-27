import { createHmac, randomUUID } from "node:crypto";
import { ZodError, z } from "zod";
import { db } from "@/lib/db";
import { log } from "@/services/observability/logger";
import { checkLoginRateLimit } from "@/services/auth/rate-limit";
import { createSession } from "@/services/auth/session";
import { verifyLoginCredential } from "@/services/auth/login";
import { getEnv } from "@/config/env";
import { captureError } from "@/services/observability/monitor";

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(1).max(256) }).strict();

function auditHash(value: string): string {
  return createHmac("sha256", getEnv().AUTH_SESSION_SECRET).update(value).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) ?? randomUUID();
  const sourceIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkLoginRateLimit(`login:${auditHash(sourceIp)}`);
  if (!rate.allowed) return Response.json({ error: { code: "RATE_LIMITED", message: "Too many login attempts." }, meta: { requestId } }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "X-Request-Id": requestId } });
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: payload.email }, include: { identities: { where: { provider: "PASSWORD" } } } });
    const identity = user?.identities[0];
    const valid = await verifyLoginCredential({ userStatus: user?.status, passwordHash: identity?.passwordHash, password: payload.password });
    const auditMetadata = { emailHash: auditHash(payload.email), sourceIpHash: auditHash(sourceIp) };
    if (!valid || !user || !identity) {
      await db.auditLog.create({ data: { action: "AUTH_LOGIN_FAILED", resourceType: "User", requestId, metadata: auditMetadata } });
      return Response.json({ error: { code: "AUTH_FAILED", message: "Invalid email or password." }, meta: { requestId } }, { status: 401, headers: { "X-Request-Id": requestId } });
    }
    const session = await createSession(user.id);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { lastSignedInAt: new Date() } }),
      db.userIdentity.update({ where: { id: identity.id }, data: { lastUsedAt: new Date() } }),
      db.auditLog.create({ data: { actorUserId: user.id, action: "AUTH_LOGIN_SUCCESS", resourceType: "User", resourceId: user.id, requestId, metadata: { sourceIpHash: auditMetadata.sourceIpHash } } }),
    ]);
    log("info", "authentication succeeded", { requestId, userId: user.id, route: "/api/auth/login" });
    return Response.json({ data: { userId: user.id, expiresAt: session.expiresAt }, meta: { requestId } }, { headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: { code: "INVALID_REQUEST", message: "Invalid login request." }, meta: { requestId } }, { status: 400, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
    captureError(error, { requestId, route: "/api/auth/login", method: "POST" });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "The login request could not be completed." }, meta: { requestId } }, { status: 500, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
  }
}
