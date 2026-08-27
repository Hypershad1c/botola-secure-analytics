# Phase 8 Deployment and Verification Checklist

## Release scope

This checklist covers deployment of the Next.js application, Prisma schema and migrations, canonical football data availability, authentication, observability, and rollback readiness. A release is not considered production-ready until the environment-dependent gates are completed against the real deployment and database.

## 1. Required production configuration

| Variable or secret | Required | Validation |
|---|---:|---|
| `NODE_ENV` | Yes | Must be `production` |
| `DATABASE_URL` | Yes | Production PostgreSQL connection string |
| `AUTH_SESSION_SECRET` | Yes | At least 32 random characters; rotate through the secret manager |
| `AUTH_COOKIE_NAME` | Yes | Stable secure-session cookie name |
| `OBSERVABILITY_TOKEN` | Yes | At least 24 random characters; required by production metrics |
| `ALLOW_DEV_ANALYTICS` | No | Must be `false` or unset in production |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical HTTPS application URL |
| `APP_URL` GitHub secret | Yes | Used by scheduled smoke monitoring |
| `OBSERVABILITY_TOKEN` GitHub secret | Yes | Used by scheduled protected metrics monitoring |

Never place credentials in the repository, browser bundle, workflow output, or error payloads.

## 2. Pre-deployment gates

Run the following against the release commit:

```bash
pnpm install --frozen-lockfile
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
pnpm test
pnpm typecheck
pnpm build
```

The CI workflow must be green before deployment. Review the generated Prisma migration list and confirm the migration lock file is committed.

## 3. Database deployment

Use the production connection string in a protected deployment environment:

```bash
pnpm prisma:deploy
```

Do not use `prisma migrate dev` against production. Confirm the migration table reports both the foundation migration and the ML model migration as applied. Verify that the application can execute `SELECT 1` through `/api/readiness` after deployment.

The development fixture can be loaded only into an explicitly designated non-production database:

```bash
SEED_DEMO_DATA=true pnpm db:seed
```

Production must use a legally permitted football source and the ingestion/canonical-persistence workflow. Never seed the development fixture into production.

## 4. Post-deploy smoke checks

Run:

```bash
pnpm verify:production
```

The command checks `/api/health`, `/api/readiness`, and protected `/api/metrics`, and fails if critical operational alerts are present. Confirm that response headers include `X-Request-Id`, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.

Open `/dashboard` and verify that the current season selector loads persisted seasons. Select a season with completed scored matches and confirm team metrics, standings, form, and methodology metadata render. If no canonical data is loaded, the empty state is expected and must not be replaced with fabricated values.

## 5. Monitoring gates

Configure the `APP_URL` and `OBSERVABILITY_TOKEN` GitHub Actions secrets, then manually run the production-monitoring workflow once. Confirm the scheduled workflow is enabled and executes every 15 minutes. Verify that liveness, readiness, and metrics checks pass and that no critical alerts are reported.

Inspect deployment logs for structured JSON records. Verify request IDs can be used to correlate a browser response, an error event, and a request metric. Confirm credential-bearing headers and secrets are redacted.

## 6. Security gates

Confirm production rejects `ALLOW_DEV_ANALYTICS=true`, requires `OBSERVABILITY_TOKEN` for metrics, enforces active sessions and `football.read` for analytics routes, and returns safe error messages without SQL, stack traces, or credentials. Confirm secure cookies and HTTPS are configured by the authentication layer and platform.

Run dependency and secret scans through the organization’s approved security tooling. Review database roles, connection limits, backups, point-in-time recovery, retention, and migration rollback procedures before go-live.

## 7. Rollback plan

If the build fails, redeploy the previous known-good commit. If the application starts but readiness fails, inspect database connectivity and revert only after determining whether the migration is backward-compatible. Do not delete migration records or manually edit production tables to force a green deployment. Disable the monitoring workflow only during a controlled maintenance window and re-enable it after recovery.

## 8. Release sign-off

A release is ready for sign-off only when the CI workflow is green, migrations are applied, readiness is healthy, protected metrics are accessible, no critical alerts are active, the dashboard displays verified canonical data or an explicit empty state, and rollback ownership is known. Record the deployed commit SHA, migration state, data-source version, verification timestamp, and operator responsible for the release.
