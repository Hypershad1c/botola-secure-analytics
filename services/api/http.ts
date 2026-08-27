import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AnalyticsNotFoundError } from "./gateway";
import { ApiAuthError } from "@/lib/auth/api-auth";
import { captureError, recordRequest } from "@/services/observability/monitor";

export function getRequestId(request: Request): string {
  return request.headers.get("x-request-id")?.slice(0, 128) || randomUUID();
}

export async function observeApiRequest(request: Request, route: string, handler: (request: Request, requestId: string) => Promise<NextResponse>): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const startedAt = performance.now();
  try {
    const response = await handler(request, requestId);
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    response.headers.set("X-Request-Id", requestId);
    recordRequest({ route, method: request.method, statusCode: response.status, durationMs, timestamp: new Date().toISOString() });
    return response;
  } catch (error) {
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    recordRequest({ route, method: request.method, statusCode: 500, durationMs, timestamp: new Date().toISOString() });
    return jsonError(error, requestId);
  }
}

export function jsonSuccess<T>(data: T, requestId: string, options?: { cached?: boolean; methodologyVersion?: string; pagination?: unknown }): NextResponse {
  return NextResponse.json({ data, meta: { requestId, cached: options?.cached ?? false, methodologyVersion: options?.methodologyVersion, pagination: options?.pagination } }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=15", "X-Request-Id": requestId },
  });
}

export function jsonError(error: unknown, requestId: string): NextResponse {
  if (error instanceof ApiAuthError) return NextResponse.json({ error: { code: error.status === 401 ? "AUTH_REQUIRED" : "FORBIDDEN", message: error.message }, meta: { requestId } }, { status: error.status, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
  if (error instanceof AnalyticsNotFoundError) return NextResponse.json({ error: { code: "NOT_FOUND", message: error.message }, meta: { requestId } }, { status: 404, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
  if (error instanceof ZodError) return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "The request query is invalid.", issues: error.issues.map((issue) => ({ path: issue.path, code: issue.code, message: issue.message })) }, meta: { requestId } }, { status: 400, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
  captureError(error, { requestId });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The analytics request could not be completed." }, meta: { requestId } }, { status: 500, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
}
