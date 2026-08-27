# Operations, Backup, Security, and Data Governance Runbook

## Scope and ownership

This runbook separates repository capabilities from operator-controlled infrastructure. The application code can validate configuration and expose health/readiness signals, but it cannot provision a production database, object store, queue, secrets manager, monitoring provider, or licensed football data source without deployment credentials and service approval.

| Area | Repository responsibility | Operator responsibility |
|---|---|---|
| Application runtime | Secure headers, session checks, RBAC, readiness checks, bounded errors | Vercel project configuration, domains, environment variables, deployment approvals |
| Database | Prisma schema, migrations, transactional persistence boundaries | Managed PostgreSQL, network policy, roles, PITR, backups, restore drills |
| Observability | Redacted logs, durable event/snapshot sink, protected metrics endpoint | Log retention, alert routing, dashboards, on-call ownership, provider integration |
| Football data | Raw/staged/canonical separation, validation, provenance and conflict records | Contract/licence approval, source credentials, refresh schedule, legal review |
| ML | Chronological feature construction, baseline training and model registry | Worker capacity, artifact storage, promotion approval, drift review, rollback |

## Backup and restore procedure

Production PostgreSQL must use provider-managed point-in-time recovery where available, plus an independent encrypted logical backup. The backup identity should be separate from the application identity and should have only the permissions required to perform the backup. Backups must be encrypted in transit and at rest, retained according to the organization’s policy, and monitored for freshness.

| Step | Procedure | Evidence required |
|---|---|---|
| 1 | Confirm the target database, migration revision, backup timestamp, and incident/change ticket. | Recorded change or incident identifier |
| 2 | Pause ingestion and worker claims, or record the exact cutover boundary. | Queue status and worker logs |
| 3 | Restore to an isolated database or provider recovery point. Never overwrite the only copy first. | Provider restore job ID |
| 4 | Run `pnpm prisma migrate deploy` only when the restored revision is known and approved. | Migration output and revision |
| 5 | Validate row counts, canonical foreign keys, active roles, current sessions, job states, and observability writes. | Validation report |
| 6 | Repoint the application only after smoke checks pass, then resume workers with idempotent keys. | Deployment record and smoke result |

A restore drill is an external operator action. The repository does not claim that a production backup or restore has been executed.

## Security operations

Security events must be investigated using request IDs, hashed login identifiers, audit records, durable observability events, and deployment logs. Never copy passwords, session tokens, authorization headers, database URLs, provider keys, or raw personal data into tickets or chat transcripts.

| Event | Immediate containment | Follow-up |
|---|---|---|
| Suspected session theft | Revoke affected sessions, rotate the session secret if exposure is confirmed, and review audit events. | Force reauthentication and document affected identities |
| Repeated login abuse | Confirm rate-limit and edge controls, block abusive traffic at the provider layer, and inspect hashed source identifiers. | Replace the current process-local limiter with a shared Redis/platform limiter |
| Data-source credential exposure | Disable and rotate the source credential immediately. | Review raw artifact access and provenance logs |
| Suspicious admin action | Preserve audit and observability records, suspend the account if necessary, and require a second reviewer. | Review RBAC assignments and add a regression test |
| Database compromise | Isolate the database, preserve logs, rotate credentials, and follow the incident owner’s evidence process. | Restore into a clean environment only after approval |

The current login limiter is intentionally process-local and is not a complete multi-instance production control. A shared limiter and edge/WAF policy are required before relying on it for production abuse prevention.

## Real football data governance

No development fixture is a substitute for licensed Botola history. Before importing real data, the operator must document the source, contractual permission, allowed fields, retention period, refresh frequency, and attribution requirements. Raw artifacts should be immutable and checksummed; normalized records must retain source references; canonical promotion must resolve aliases and send ambiguous conflicts to review rather than silently guessing.

| Gate | Required decision |
|---|---|
| Source permission | Is the source licensed for this use, storage duration, and redistribution scope? |
| Data dictionary | Are competition, season, team, player, match, score, event, and timestamp fields defined? |
| Identity resolution | Are aliases mapped by approved rules with human review for collisions? |
| Correction policy | How are provider corrections, conflicts, deletions, and late results recorded? |
| Privacy | Are player fields limited to the purpose and lawful basis of the product? |
| Provenance | Can every canonical value be traced to an artifact, row, run, and reviewer? |

## ML promotion and rollback

Models are trained outside Vercel through the durable worker boundary. Each artifact must record the feature schema version, training dataset hash, hyperparameters, metrics, and source model version. A validated model is not automatically production. Promotion requires a reviewer, an evaluation report, a rollback target, and a record of the prediction horizon and data cutoff.

| Lifecycle state | Meaning | Required control |
|---|---|---|
| Training | Artifact is being built and has no serving authority. | Isolate from production prediction reads |
| Validated | Artifact passed deterministic tests and review thresholds. | Record metrics and dataset hash |
| Production | Artifact is approved for serving. | Keep one prior production model for rollback |
| Retired | Artifact is no longer eligible for new predictions. | Preserve provenance for historical evaluation |

Drift monitoring must compare recent calibration, outcome distributions, feature availability, and source freshness against the approved baseline. The repository currently provides the baseline model and persistence primitives; production drift thresholds and alert routing remain operator decisions.

## Secret and access lifecycle

Secrets must be created in the deployment platform or a secrets manager, never committed to Git. Rotate database credentials, session secrets, source credentials, observability tokens, and worker credentials on a documented schedule and immediately after suspected exposure. Access should be role-based, least-privilege, separately attributable, and removed when an operator leaves the project.

## External gates before launch

The following items cannot be honestly marked complete from the sandbox: provisioning managed PostgreSQL and PITR, configuring object storage and a shared queue, installing a multi-instance rate limiter, obtaining permitted real Botola data, creating the first production administrator, deploying to Vercel, setting production secrets, configuring alert delivery, and completing a backup restore drill.
