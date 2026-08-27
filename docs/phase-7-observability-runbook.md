# Phase 7 Observability and Monitoring Runbook

## Observability architecture

The application emits structured JSON logs to standard output, correlates requests with an `X-Request-Id`, records bounded in-process request metrics, captures normalized error events with stable fingerprints, and exposes health and operational metrics endpoints. The design is provider-neutral so deployment can forward stdout to a managed log and error platform without changing application code.

| Surface | Endpoint or output | Purpose | Exposure |
|---|---|---|---|
| Liveness | `GET /api/health` | Confirms the process is serving requests and reports build version | Public |
| Readiness | `GET /api/readiness` | Verifies database connectivity and reports dependency latency | Public, no secrets |
| Metrics | `GET /api/metrics` | Returns request totals, error rates, p95 latency, error fingerprints, and alerts | Token-protected in production |
| Structured logs | Standard output | Request, warning, error, and redacted context records | Deployment log sink |
| Scheduled monitor | `.github/workflows/monitoring.yml` | Checks liveness, readiness, metrics, and critical alerts every 15 minutes | GitHub Actions |

## Correlation

Every observed request uses the incoming `X-Request-Id` when it is short enough, otherwise a new UUID is generated. The ID appears in the response header, JSON metadata, request metric, and captured error context. Operators should include this identifier in incident tickets and log searches.

## Redaction rules

The structured logger recursively redacts authorization headers, cookies, tokens, passwords, secrets, API keys, and database URLs. Error messages are truncated before storage in the in-process error buffer. The metrics endpoint exposes error fingerprints and counts, not raw stacks or request credentials.

## Alert thresholds

| Alert | Default threshold | Severity behavior |
|---|---:|---|
| `HIGH_ERROR_RATE` | 5% of retained requests | Warning at threshold; critical at 10% |
| `HIGH_LATENCY` | 1,500 ms p95 | Warning at threshold; critical at 3,000 ms |
| `ERROR_BURST` | 10 captured errors in one hour | Warning at threshold; critical at 20 |
| `READINESS_FAILURE` | Workflow readiness check fails | Workflow failure; investigate database or deployment health |

The current process-local metric store is intentionally bounded. A production deployment should forward logs and metrics to a durable external platform or replace the store behind the same service contract with Redis or a managed metrics backend.

## Incident response

When a scheduled monitor fails, first open `/api/health` and `/api/readiness` manually. If liveness fails, check deployment status, runtime logs, and the latest commit. If liveness succeeds but readiness fails, inspect database connectivity, migration status, connection limits, and secret configuration. If metrics reports a critical alert, use the request route and error fingerprint to identify the failing surface, then correlate affected requests using `X-Request-Id`.

Do not expose the observability token in workflow output or browser code. Rotate `OBSERVABILITY_TOKEN` after any suspected disclosure. When a fix is deployed, rerun the workflow manually and confirm both readiness and metrics return to a non-critical state.

## Required deployment secrets

The scheduled workflow expects `APP_URL` and `OBSERVABILITY_TOKEN` GitHub Actions secrets. `OBSERVABILITY_TOKEN` must be at least 24 characters and is accepted only as a bearer token on `/api/metrics` in production. Local development permits the endpoint without a token so the implementation can be tested safely without production credentials.
