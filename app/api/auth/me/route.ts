import { getCurrentUser } from "@/services/auth/current";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: { code: "AUTH_REQUIRED", message: "Authentication required." }, meta: { requestId } }, { status: 401, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
  return Response.json({ data: user, meta: { requestId } }, { headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } });
}
