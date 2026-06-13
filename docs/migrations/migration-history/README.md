# Migration history archive (pre-v1.0)

Esiana squashed **78 incremental Prisma migrations** into a single v1 baseline on **2026-06-13**.

## Active migrations (fresh installs)

Fresh installs apply only:

- [`backend/prisma/migrations/20260613190000_v1_baseline/`](../../../backend/prisma/migrations/20260613190000_v1_baseline/)

See [migration-squash-verification-20260613.md](../../audits/migration-squash-verification-20260613.md).

## Archived pre-squash chain

**Read-only reference — do not apply on fresh installs.**

| Archive | Date | Count |
|---------|------|------:|
| [`pre-v1-squash-20260613/`](./pre-v1-squash-20260613/) | 2026-06-13 | 78 |

Includes partial baselines `20260527214000_baseline_core_schema` and `20260527215000_baseline_system_setting`, plus incremental migrations through `20260613180000_remove_campaign_plugin_manifest_policy`.

Manifest: [`pre-v1-squash-20260613/MIGRATION_MANIFEST.txt`](./pre-v1-squash-20260613/MIGRATION_MANIFEST.txt)

## Upgrade notes

Existing beta databases on the 78-folder chain **cannot** jump directly to the squashed baseline without a documented bridge. Options: run the archived chain once, or re-seed. Details in [migration-audit.md](../../audits/migration-audit.md).

Do not edit archived SQL except to add explanatory README notes.
