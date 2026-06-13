# Pre-1.0 migration audit

**Audited:** 2026-06-13  
**Migration count:** 78 folders (`20260527214000_baseline_core_schema` → `20260613180000_remove_campaign_plugin_manifest_policy`)

## Inventory summary

| Item | Result |
|------|--------|
| Baseline squash | Partial — two May 2025 baseline migrations capture pre-`migrate` `db push` state |
| Incremental migrations | 76 after baseline |
| Dead migrations queued post-1.0 | **None identified** — latest churn is plugin secrets + manifest policy cleanup |
| Superseded patterns | Template Studio removed (`20260609200000_remove_campaign_templates`); campaign `slug` → `handle` |

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

## Squash plan — release artifact (v1.0.0 tag only)

**Do not squash during normal development.** Squash executes only after RC approval and final schema freeze sign-off.

**Not a dev task.** Treat `20260701000000_v1_baseline` as a release artifact:

```text
RC approved
  ↓
No pending schema changes
  ↓
Generate v1_baseline migration
  ↓
Verify fresh install (Postgres + SQLite)
  ↓
Archive pre-freeze folders → migration-history/
  ↓
Tag v1.0.0
```

At tag time:

1. Generate one **`20260701000000_v1_baseline`** migration from current `schema.prisma` (Postgres + SQLite portable SQL)
2. Archive pre-freeze folders to [`migration-history/](./migration-history/README.md)` (read-only reference)
3. Document upgrade path: beta instances run full 78-folder chain once; fresh installs apply single baseline

Existing beta databases **must not** jump directly to squashed baseline without a documented migration bridge.

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
- [ ] Squash execution (at tag time)
- [x] No pending destructive migrations queued for post-1.0
