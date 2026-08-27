# Phase 2 Secure Ingestion Pipeline and Data Validation Service

## Scope

Phase 2 turns the Phase 1 ingestion skeleton into a deterministic, bounded, provenance-aware validation service. It accepts source CSV content or a downloaded artifact, refuses unsafe inputs, normalizes football entities, validates match records, detects duplicates and conflicts, produces an immutable checksum, and emits an operator-readable report.

## Trust boundaries

```text
External source
  → HTTPS allowlisted downloader
  → immutable artifact bytes + SHA-256
  → bounded CSV parser
  → source-record envelope
  → canonical normalizer
  → business validator
  → duplicate/conflict classifier
  → report + staged persistence adapter
```

The external source is untrusted. It may be unavailable, malformed, unexpectedly large, or inconsistent with previous data. No external field is used in a SQL query without passing through typed validation. No source adapter writes directly to canonical football tables.

## Security controls

| Control | Implementation |
|---|---|
| Transport | HTTPS only, exact host allowlist, credential-bearing URLs rejected, redirects disabled |
| Resource limits | Maximum artifact bytes, rows, columns, and cell length |
| CSV injection | Formula-like cells rejected; negative numeric values remain available for business validation |
| Integrity | SHA-256 checksum stored with artifact metadata and used in deterministic storage keys |
| Replay safety | Source IDs and match fingerprints are tracked; replays become duplicates rather than new records |
| Conflict safety | Same fingerprint with different scores becomes an explicit conflict |
| Secret handling | Credential-bearing response headers are redacted before diagnostics |
| Persistence | Artifact, ingestion run, staged rows, and conflicts are persisted through a transaction adapter |
| Serverless boundary | Downloading and bulk ingestion are worker operations; request handlers should only create or inspect runs |

## Validation lifecycle

A source row first passes structural checks for required fields, field lengths, and dangerous cell patterns. It is then normalized into canonical competition, season, team, date, and score values. Business validation checks the season format, distinct teams, parseable date range, and non-negative integer scores. Finally, the pipeline checks source-record IDs and match fingerprints.

A row is classified as:

| Status | Meaning |
|---|---|
| `ACCEPTED` | Structurally and semantically valid, and not previously accepted |
| `REJECTED` | Contains one or more validation failures |
| `DUPLICATE` | Repeats an already accepted source record or identical match fingerprint |
| `CONFLICT` | Repeats a match fingerprint but disagrees on scores |

## Persistence behavior

The Prisma adapter creates or reuses a `RawArtifact` by source and checksum, creates an `IngestionRun` with summary counters, stages every classified record, and writes `DataConflict` rows for conflicting fingerprints. The adapter is intentionally separate from the parser and validator so that deterministic unit tests do not require a database.

## Operational workflow

1. Download the source through the allowlisted client or provide a local fixture.
2. Compute the checksum before transformation.
3. Run `runMatchCsvPipeline` with source and dataset metadata.
4. Store the raw bytes under the checksum-derived artifact key.
5. Persist the report, run metadata, staged records, and conflicts transactionally.
6. Review rejected records and open conflicts before any canonical promotion.
7. Promote only accepted records in a later canonical-import step.

The Phase 2 service deliberately does not silently resolve conflicts or invent missing values. Missing optional values remain null, while missing required values are rejected and reported.
