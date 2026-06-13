# Pre-1.0 release candidate checklist

Complete before tagging **v1.0.0**.

## Automated gates

- [ ] `npm ci && npm run build` (CI `build` job)
- [ ] `test-sqlite` — full backend tests on SQLite (export matrix + backup round-trip)
- [ ] `test-postgres` — full backend tests on PostgreSQL (export matrix + backup round-trip)
- [ ] Postgres fresh install: `docker compose up -d --build` — migrations apply automatically via backend entrypoint
- [x] OpenAPI loads at `/api/docs` — build copies spec to `dist/backend/openapi`; loader fallback to source
- [ ] [database-portability-audit.md](../audits/database-portability-audit.md) reviewed
- [ ] [prisma-transaction-audit.md](../audits/prisma-transaction-audit.md) reviewed

## Data sovereignty

- [ ] Sovereign export → restore on **new** campaign (wizard)
- [ ] Sovereign export → restore **in-campaign** (destructive)
- [ ] Entity matrix A-tier rows green — [pre-1.0-export-audit.md](../audits/pre-1.0-export-audit.md)
- [ ] `sovereign/knowledge.json` round-trip (aliases + claims)

## Migration

- [ ] [migration-audit.md](../audits/migration-audit.md) reviewed
- [ ] Upgrade path tested from v0.9.0 DB snapshot (manual)
- [x] Baseline squash executed — [migration-squash-verification-20260613.md](../audits/migration-squash-verification-20260613.md); fresh SQLite install verified locally; Postgres fresh install gated on CI `test-postgres`

## Integrator experience

- [ ] Plugin hello-world in <30 min — [plugin development](../../../docs/plugin-development/getting-started.md)
- [x] OpenAPI examples for auth, campaigns, wiki, backup, import-providers — see [openapi.yaml](../../backend/openapi/openapi.yaml); smoke test `src/routes/openapiDocs.test.ts`

## Manual RC pass (GM)

- [ ] Campaign Home loads
- [ ] Create/edit wiki page (character, location)
- [ ] Map temporal scrub + fog reveal
- [ ] Export sovereign ZIP
- [ ] Restore backup
- [ ] Enable example plugin

## Ship

- [ ] [todo.md](../../todo.md) release gates complete
- [ ] [changelog.md](../../changelog.md) v1.0.0 entry
- [ ] Git tag `v1.0.0`
