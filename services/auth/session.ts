import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getEnv } from "@/config/env";

const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const runtimeEnv = getEnv();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token, runtimeEnv.AUTH_SESSION_SECRET);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1_000);
  const session = await db.session.create({ data: { userId, tokenHash, expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(runtimeEnv.AUTH_COOKIE_NAME, token, { httpOnly: true, secure: runtimeEnv.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  return { sessionId: session.id, expiresAt };
}

export async function revokeSessionByToken(token: string) {
  const runtimeEnv = getEnv();
  const tokenHash = hashSessionToken(token, runtimeEnv.AUTH_SESSION_SECRET);
  await db.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  const cookieStore = await cookies();
  cookieStore.set(runtimeEnv.AUTH_COOKIE_NAME, "", { httpOnly: true, secure: runtimeEnv.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function hashSessionToken(token: string, secret: string) {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function sessionTokenFromRequest(request: Request, cookieName: string) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) return bearer;
  const header = request.headers.get("cookie") ?? "";
  const pair = header.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${cookieName}=`));
  return pair ? decodeURIComponent(pair.slice(cookieName.length + 1)) : null;
}
