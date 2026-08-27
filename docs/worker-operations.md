# Durable Worker Operations

## Purpose

The web application only validates and enqueues work. It does not perform bulk ingestion, model training, or prediction refreshes inside a Vercel request handler. Durable work is represented by the PostgreSQL `Job` table and is executed by an external worker, managed cron runner, queue consumer, or persistent VM.

| Job kind | Current boundary | Default handler | Production requirement |
|---|---|---|---|
| `INGESTION` | Reads a bounded CSV from the worker input root, runs secure parsing and validation, and persists raw/staged/provenance records | Implemented for local/VM execution | Replace local file input with an approved object-storage adapter and complete canonical promotion after source/legal approval |
| `ML_TRAINING` | Loads completed canonical matches, builds leakage-safe features, trains the baseline model, and persists a validated model version | Implemented for local/VM execution | Configure artifact storage, model review/promotion, and resource limits outside Vercel |
| `PREDICTION_REFRESH` | Queue contract exists, but no default handler is registered | Explicit adapter required | Implement a reviewed prediction adapter for scheduled fixtures and persist model/version provenance |

## Queue contract

Each job has a unique `idempotencyKey`. Enqueueing the same key returns the existing job rather than creating duplicate work. A worker claims only queued jobs whose `scheduledFor` timestamp has arrived. Claiming increments `attempts` and uses a conditional status update to reduce duplicate claims across concurrent workers.

Failures are requeued with bounded backoff until `maxAttempts` is reached. Exhausted jobs enter `DEAD_LETTER` and require operator review. The `lastError` field is truncated to a bounded length; secrets and raw credentials must never be placed in payloads or error messages.

## Interfaces

The protected `POST /api/internal/jobs` endpoint requires the `football.jobs` permission. Its only responsibility is validating a small JSON payload and writing a job row. The `pnpm jobs:worker:once` command claims and executes at most one job. This command is intended for a worker process or externally scheduled task, not for a normal Vercel route.

The default ingestion handler accepts `sourceCode`, `datasetName`, `datasetVersion`, `inputPath`, and `storageKey`. `inputPath` must remain beneath `WORKER_INPUT_ROOT`. The default ML handler accepts `seasonId`, an optional model `version`, and an optional `artifactKey`. Both handlers use existing repository services and do not bypass raw, normalized, staged, and canonical boundaries.

## Operator deployment checklist

| Item | Status in repository | Operator action |
|---|---|---|
| PostgreSQL migration | Migration file committed | Run `pnpm prisma:deploy` against the production database |
| Worker execution | One-shot command committed | Run through a managed job runner, queue consumer, or persistent VM with a concurrency limit |
| Object storage | Adapter boundary documented | Provide credentials and configure an approved storage adapter; do not use local disk for durable production artifacts |
| Queue scheduling | Enqueue route committed | Configure an authenticated scheduler or internal operator workflow; keep idempotency keys deterministic |
| Prediction refresh | Not implemented by default | Supply and review a handler before enqueueing `PREDICTION_REFRESH` jobs |
| Retries and alerts | Database state available | Alert on `DEAD_LETTER` jobs and stale `RUNNING` jobs; add a lease-recovery process before production |
| Canonical promotion | Not part of the default ingestion handler | Implement alias resolution, transactionally idempotent promotion, conflict review, and source licensing checks |

## Security requirements

The worker must run with a dedicated database identity limited to the tables and operations it requires. Job payloads should contain references, not credentials or large data blobs. The queue endpoint must remain permission-protected, and the worker environment must use separate secrets from the web runtime where possible. The current conditional claim is intentionally conservative; a production deployment should add lease expiry and recovery for workers terminated while holding a job.

## Explicit external gates

This repository does not claim that a cloud queue, object store, production database, worker host, real football provider, or scheduler has been provisioned. Those steps require operator credentials, service selection, data-source permission, and deployment verification in the target environment.
