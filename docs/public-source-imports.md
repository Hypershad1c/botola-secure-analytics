# Public football source imports

Updated 2026-08-27.

## Sources currently verified

| Source | Competition coverage verified | Access status | Licence / usage note |
|---|---|---|---|
| [openfootball/world](https://github.com/openfootball/world) | Morocco Botola Pro 1: 2023/24 and 2024/25 | Raw files fetched successfully | Repository states CC0 1.0 Universal/public-domain dedication; retain source URL and SHA-256 provenance. |
| [Elbotola public analytics](https://m.elbotola.com/en/analytics/season/p3glrw7hd65qdyj/) | Morocco Botola 2 2025/26 public matches endpoint | JSON endpoint returned HTTP 200 without credentials | Public-page retrieval only; use conservative rate limits, obey `robots.txt`, do not access `/user/` or `/search`, and verify any commercial or redistribution terms with the publisher. |

FootyStats remains a documented candidate but its CSV links returned HTTP 403/CAPTCHA/Premium access in this environment. No restriction was bypassed.

## Verified dry-run counts

The openfootball adapter parsed the two checked-in source files with 240 accepted records for 2023/24 and 200 accepted records for 2024/25, with zero rejects, duplicates, or conflicts. The Elbotola adapter fetched 30 public match weeks for season ID `p3glrw7hd65qdyj` and received 254 unique match records for the supplied current Botola 2 season; all 254 were accepted with zero rejects, duplicates, or conflicts in the dry run.

These are validation counts, not database insertion counts. The current sandbox has no `DATABASE_URL`, so no PostgreSQL write was attempted.

## Reproducible commands

Openfootball files are checked into `data/sources/openfootball/morocco/` and can be validated without a database:

```bash
pnpm import:openfootball data/sources/openfootball/morocco/2023-24_ma1.txt data/sources/openfootball/morocco/2024-25_ma1.txt
```

The importer defaults to dry-run. With a migrated PostgreSQL database and the source catalog seeded, persistence and canonical promotion are explicit:

```bash
pnpm db:seed
pnpm import:openfootball data/sources/openfootball/morocco/2023-24_ma1.txt data/sources/openfootball/morocco/2024-25_ma1.txt --persist
```

For the public Elbotola Botola 2 endpoint:

```bash
pnpm import:elbotola p3glrw7hd65qdyj 2025/26 --max-weeks=30
pnpm import:elbotola p3glrw7hd65qdyj 2025/26 --max-weeks=30 --persist
```

The Elbotola command requests one week at a time with a minimum 750 ms delay by default, validates each JSON response at the source boundary, deduplicates by publisher match ID, retains the fetched JSON bundle as the raw artifact, and then uses the existing staging and transactional canonical-promotion path. Run it from a managed worker or operator environment, not from a normal Vercel request.

## Important limitations

The openfootball source covers Botola Pro only in the verified files. The Elbotola season ID above covers one Botola 2 season and is not proof of historical Botola 2 or Morocco Cup coverage. The application must show source, retrieval date, dataset version, and freshness for all imported data. Do not merge competitions solely by similar team names; canonical promotion records source aliases and keeps competition and season boundaries separate.
