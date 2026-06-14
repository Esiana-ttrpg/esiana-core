# Migration squash verification (2026-06-13)

**Baseline:** `20260613190000_v1_baseline`  
**Replaces:** 78 incremental migrations archived at [`docs/migrations/migration-history/pre-v1-squash-20260613/`](../migrations/migration-history/pre-v1-squash-20260613/)  
**Schema changes:** None — migration-history cleanup only.

## Pre-flight (pre-squash)

| Check | Result |
|-------|--------|
| `list-missing-migration-tables.mjs` | Known false positives from `CREATE TABLE IF NOT EXISTS` in legacy SQL; no blocking drift |
| `migrate diff --from-migrations --to-schema-datamodel` (Postgres) | Empty |
| `migrate diff --from-migrations --to-schema-datamodel` (SQLite, pre-squash chain) | Large diff (legacy PRAGMA / provider history); Postgres chain was authoritative |

## Baseline generation

| Item | Detail |
|------|--------|
| Command | `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` |
| Provider for generation | **sqlite** (dual-engine portability; avoids Postgres-only `CREATE TYPE` / `CREATE SCHEMA`) |
| Hand edits | JSON defaults: `DEFAULT {}` → `DEFAULT '{}'`, `DEFAULT []` → `DEFAULT '[]'` (25 columns); timestamps: `DATETIME` → `TIMESTAMP(3)` (174 columns); **CREATE TABLE order** topologically sorted for Postgres inline FK constraints |
| PRAGMA | None in baseline |
| `CREATE TABLE` count | 83 |
| `model` count in schema | 82 |

## Active migration tree (post-squash)

```
backend/prisma/migrations/
  migration_lock.toml          # provider = "postgresql"
  20260613190000_v1_baseline/
    migration.sql
```

## Verification results

### Postgres (shadow / migration chain)

| Step | Result |
|------|--------|
| `migrate diff --from-migrations --to-schema-datamodel` | Empty (`-- This is an empty migration.`) |
| Fresh `migrate deploy` on empty DB | **PGlite + CI `test-postgres`** (see 2026-06-14 fix: UTF-8 BOM strip, Postgres 63-char index rename) |
| `prisma generate` | Pass |
| `tsc --noEmit` | Pass |

### SQLite (fresh empty DB)

Executed with `schema.prisma` + `migration_lock.toml` temporarily set to `sqlite` (matches CI `test-sqlite` job).

| Step | Result |
|------|--------|
| `prisma migrate deploy` | Pass — 1 migration applied |
| `prisma migrate status` | Database schema is up to date |
| `migrate diff --from-url --to-schema-datamodel` | Empty |
| `prisma generate` | Pass |
| `tsc --noEmit` | Pass |

## CI alignment

[`.github/workflows/build.yml`](../../.github/workflows/build.yml) `test-sqlite` job sed-patches both `schema.prisma` and `migration_lock.toml` to `sqlite` before `migrate deploy`.

## Upgrade path (documented, not implemented)

| Audience | Path |
|----------|------|
| Fresh install (post-squash) | `migrate deploy` → applies `20260613190000_v1_baseline` only |
| Disposable dev DBs | Delete DB / `prisma migrate reset` → redeploy baseline |
| Existing beta on 78-chain | Cannot jump to squashed baseline in-place; run full archived chain once or re-seed |

## Archive manifest

78 folders listed in [`MIGRATION_MANIFEST.txt`](../migrations/migration-history/pre-v1-squash-20260613/MIGRATION_MANIFEST.txt).
