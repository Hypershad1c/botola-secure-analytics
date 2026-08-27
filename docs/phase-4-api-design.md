# Phase 4 Analytics API Gateway and UI Endpoints

## API boundary

The Phase 4 API exposes read-only, UI-facing analytics endpoints under `/api/v1/analytics`. Route handlers are intentionally thin: they create a request ID, authenticate the caller, validate query and path parameters, call the analytics gateway, and return a stable response envelope.

The gateway owns caching, sorting, pagination, and not-found behavior. The analytics service owns database reads and metric calculation. The Prisma repository remains the only layer that knows raw SQL or database relation details.

## Endpoint catalog

| Endpoint | Purpose | Permission | Pagination |
|---|---|---|---|
| `GET /api/v1/analytics/season?seasonId=...` | Team-season analytics for dashboard cards and tables | `football.read` | Yes |
| `GET /api/v1/analytics/standings?seasonId=...` | Points-ranked team analytics for standings views | `football.read` | Yes |
| `GET /api/v1/analytics/players?seasonId=...` | Player-season analytics sorted by performance score | `football.read` | Yes |
| `GET /api/v1/analytics/team/:teamId?seasonId=...` | One team's season analytics | `football.read` | No |
| `GET /api/v1/analytics/player/:playerId?seasonId=...` | One player's season analytics | `football.read` | No |

`seasonId`, `teamId`, and `playerId` are UUIDs. `page` defaults to 1 and `pageSize` defaults to 25, with a maximum page size of 100. Unknown query parameters are rejected so the UI cannot accidentally believe an unsupported sort or filter was applied.

## Response envelope

Successful responses use:

```json
{
  "data": [],
  "meta": {
    "requestId": "...",
    "cached": false,
    "methodologyVersion": "phase-3-v1",
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

Errors use stable codes such as `AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`, and `INTERNAL_ERROR`. Internal exception text, SQL, provider credentials, and stack traces are never returned to the browser. Every response includes an `X-Request-Id` header for support and audit correlation.

## Authorization

Every analytics endpoint requires a valid active session or bearer session token and the `football.read` permission. Permission checks occur on the server and default to deny. UI route visibility is not treated as authorization. The session lookup compares only an HMAC-derived token hash and rejects expired or revoked sessions.

## Caching

The gateway uses a 30-second, bounded in-memory cache per running application instance. Cache keys include the season ID, so one season cannot leak into another query. Responses carry `Cache-Control: private` because analytics may be permission-sensitive. The cache is an optimization only; correctness comes from the database and metric methodology version.

A future shared Redis cache can replace the in-memory implementation behind the same `getOrSetCached` boundary. The API must not become dependent on cache availability.

## UI integration guidance

UI clients should treat `meta.pagination` as authoritative, preserve `meta.methodologyVersion` in analytics views, display explicit empty states when `data` is empty, and surface the `requestId` when an error is reported. UI code must not calculate standings or overwrite metric values locally. Filters that are not part of the contract must not be sent until the gateway supports and validates them.
