import { jsonSuccess, observeApiRequest } from "@/services/api/http";

export async function GET(request: Request) {
  return observeApiRequest(request, "/api/health", async (_observedRequest, requestId) => jsonSuccess({ status: "ok", service: "botola-secure-analytics", version: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.npm_package_version ?? "development" }, requestId));
}
