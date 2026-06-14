# Pre-1.0 release candidate checklist

Complete before tagging **v1.0.0**.

## Automated gates

- [x] `npm ci && npm run build` (CI `build` job)
- [x] `test-sqlite` — full backend tests on SQLite (export matrix + backup round-trip)
- [x] `test-postgres` — full backend tests on PostgreSQL (export matrix + backup round-trip)
- [x] Postgres fresh install: `docker compose up -d --build` — migrations apply automatically via backend entrypoint (CI `docker-build` job)
- [x] OpenAPI loads at `/api/docs` — build copies spec to `dist/backend/openapi`; loader fallback to source
- [x] [database-portability-audit.md](../audits/database-portability-audit.md) reviewed
- [x] [prisma-transaction-audit.md](../audits/prisma-transaction-audit.md) reviewed
- [x] Release workflow — [`.github/workflows/release.yml`](../../.github/workflows/release.yml) (tag → CI → GHCR → GitHub Release)
- [x] `npm pack` tarball inspected — no secrets, databases, or test artifacts included

## Data sovereignty

> Recommended falsification test: export → delete instance → restore → verify campaign integrity.

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

> Operator verification required before production deployment. CI validates build, tests, and Docker compose — not live campaign workflows.

- [ ] Campaign Home loads
- [ ] Create/edit wiki page (character, location)
- [ ] Map temporal scrub + fog reveal
- [ ] Export sovereign ZIP
- [ ] Restore backup
- [ ] Enable example plugin

## Ship

- [x] [todo.md](../../todo.md) release gates complete
- [x] [changelog.md](../../changelog.md) v1.0.0 entry
- [x] Git tag `v1.0.0` on `main` (triggers release workflow) — pushed 2026-06-14; monitor [Release workflow](https://github.com/Esiana-ttrpg/esiana-core/actions/workflows/release.yml)
