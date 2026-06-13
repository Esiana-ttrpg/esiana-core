# Pre-1.0 migration audit

**Audited:** 2026-06-13  
**Squash executed:** 2026-06-13 — see [migration-squash-verification-20260613.md](./migration-squash-verification-20260613.md)  
**Active migration count:** 1 (`20260613190000_v1_baseline`)  
**Archived pre-squash count:** 78 folders → [`migration-history/pre-v1-squash-20260613/`](../migrations/migration-history/pre-v1-squash-20260613/)

## Inventory summary

| Item | Result |
|------|--------|
| Baseline squash | **Executed** — 78 incremental migrations archived; single v1 baseline active |
| Pre-squash chain | `20260527214000_baseline_core_schema` → `20260613180000_remove_campaign_plugin_manifest_policy` (read-only archive) |
| Dead migrations queued post-1.0 | **None identified** |
| Superseded patterns | Template Studio removed; campaign `slug` → `handle` (folded into baseline) |
| `migration_lock.toml` | `provider = "postgresql"` (aligned with schema default) |

## Tooling

| Script | Purpose |
|--------|---------|
| [`list-missing-migration-tables.mjs`](../backend/prisma/scripts/list-missing-migration-tables.mjs) | Tables referenced in migrations but absent from current schema introspection baseline |
| [`check-migration-state.ts`](../backend/prisma/scripts/check-migration-state.ts) | Applied migration inspection |
| [`reconcile-migration-checksums.mjs`](../backend/prisma/scripts/reconcile-migration-checksums.mjs) | Fix `_prisma_migrations.checksum` after intentional SQL edits |

Run before freeze:

```bash
cd backend
node prisma/scripts/list-missing-migration-tables.mjs
npx tsx prisma/scripts/check-migration-state.ts
```

## Constraint review (manual pass)

### Tenant isolation

- Campaign-scoped models include `campaignId` with indexes — see [`tenant-isolation-audit.md`](../security/tenant-isolation-audit.md)
- Wiki restore preserves page IDs globally — documented collision risk in backup guide

### FK cascades

- Lore/knowledge tables cascade on `WikiPage` delete — safe for destructive restore
- `RumorCirculation` → `CalendarEvent` uses `Restrict` — intentional; calendar rows not in sovereign export

### Uniqueness / restore hazards

| Constraint | Risk | Mitigation |
|------------|------|------------|
| `WikiPage.id` global unique | Cross-campaign restore collision | Document: restore to new empty campaign or retire source |
| `EntityHistoricalAlias.stableKey` | Re-import generates new keys on create | Sovereign knowledge restore uses create APIs (new stable keys) — acceptable |
| `Campaign.handle` unique | New campaigns only on wizard restore | OK |

### Indexes

No missing `campaignId` indexes flagged on hot paths during this audit. Post-freeze: index-only migrations allowed per [todo.md](../../todo.md) post-1.0 policy.

## Squash execution (2026-06-13)

**Status:** Complete — pre-v1.0 tag as dedicated PR.

| Deliverable | Location |
|-------------|----------|
| Active baseline | `backend/prisma/migrations/20260613190000_v1_baseline/` |
| Archive (78 folders) | [`migration-history/pre-v1-squash-20260613/`](../migrations/migration-history/pre-v1-squash-20260613/) |
| Verification report | [migration-squash-verification-20260613.md](./migration-squash-verification-20260613.md) |

**Generation notes:** Baseline SQL generated with sqlite provider for dual-engine portability; JSON column defaults and timestamp types hand-normalized (`'{}'`, `'[]'`, `TIMESTAMP(3)`) so **Postgres `migrate deploy` succeeds on untouched repo state** (CI `test-postgres` applies no sed patches).

**Upgrade path:**

| Audience | Path |
|----------|------|
| Fresh install | `migrate deploy` → single baseline only |
| Disposable dev DBs | Reset / delete DB → redeploy |
| Existing beta on 78-chain | Cannot jump in-place; run archived chain once or re-seed |

See also [database-portability-audit.md](./database-portability-audit.md) for the full v1.0 pipeline order.

## Verification gates

| Gate | Command / action | CI |
|------|------------------|-----|
| Fresh install | `prisma migrate deploy` on empty DB | `test-postgres` + `test-sqlite` jobs |
| Dual-engine tests | Full backend suite | [`.github/workflows/build.yml`](../../.github/workflows/build.yml) |
| Portability audit | Raw SQL, ordering, case sensitivity | [database-portability-audit.md](./database-portability-audit.md) |
| Upgrade path | Migrate v0.9.0 fixture → HEAD | Manual fixture + CI when snapshot checked in |
| Export survives migrate | Export → migrate → restore matrix tests | `pre1ExportEntityMatrix.integration.test.ts` (both CI jobs) |

## Schema freeze checklist

- [x] Extension points documented — [lore-knowledge-extension-points.md](./lore-knowledge-extension-points.md), [capability-matrix.md](../plugins/capability-matrix.md)
- [x] Migration audit (this document)
- [x] Squash execution — [migration-squash-verification-20260613.md](./migration-squash-verification-20260613.md) (2026-06-13, pre-tag PR)
- [x] No pending destructive migrations queued for post-1.0
