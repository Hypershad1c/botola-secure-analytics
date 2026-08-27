import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/config/env";

export function isObservabilityAuthorized(request: Request): boolean {
  const runtimeEnv = getEnv();
  if (runtimeEnv.NODE_ENV !== "production") return true;
  if (!runtimeEnv.OBSERVABILITY_TOKEN) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = Buffer.from(runtimeEnv.OBSERVABILITY_TOKEN);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
