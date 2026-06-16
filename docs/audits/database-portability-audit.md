# Database portability audit

**Status:** Audited 2026-06-13  
**Related:** [migration-audit.md](./migration-audit.md), [pre-1.0-export-audit.md](./pre-1.0-export-audit.md)

Dual-engine confidence gate before Postgres default deployment and final schema freeze.

## v1.0 pipeline position

```text
1. Database portability audit (this document)
2. Postgres CI parity
3. Postgres default deployment
4. Final schema freeze
5. Baseline squash (release artifact)
6. RC
7. v1.0.0 tag
```

---

## Docker Prisma client (Step 0)

| Finding | Disposition |
|---------|-------------|
| [`docker/backend.Dockerfile`](../../docker/backend.Dockerfile) generated client from `provider = "sqlite"` while Compose steered operators to PostgreSQL | **Fixed** — build arg `PRISMA_DATABASE_PROVIDER` (default `postgresql`); optional `sqlite` image via sed before `db:generate` |

---

## Raw SQL review

| Category | Result | Notes |
|----------|--------|-------|
| `backend/src/` application code | **Pass** | No `$queryRaw` / `$executeRaw` / `Prisma.sql` |
| Migrations (78 folders) | **Pass** | Portable `CREATE TABLE IF NOT EXISTS` / quoted identifiers; spot-checked recent folders |
| Maintenance scripts | **Documented (SQLite-only)** | [`check-migration-state.ts`](../../backend/prisma/scripts/check-migration-state.ts), [`ensure-world-advance-receipt-table.ts`](../../backend/prisma/scripts/ensure-world-advance-receipt-table.ts) — dev tooling only; not used in production paths |
| README schema copy | **Updated** | Prisma schema uses String columns for role-like literals; enforce in shared/domain.ts. CI: `validate-dual-engine-portability.mjs` + `dualEnginePortability.integration.test.ts` |

---

## Ordering review

User-visible lists audited for deterministic `orderBy` (NULL/tie-break parity). Secondary sort `{ id: 'asc' }` (or `{ pageId: 'asc' }` on stats) added where primary keys can tie.

| Surface | Files | Disposition |
|---------|-------|-------------|
| Campaign Home feeds | `buildDashboardSummary.ts`, `buildRecentEntityFeed.ts` | **Fixed** — session schedules tie-break on `timelinePointId` (PK) |
| Recent activity | `campaignActivityController.ts` | **Fixed** |
| Timeline / chronology | `chronologyController.ts` | **Fixed** |
| Session notes / codex | `wikiController.ts` (session timeline, arcs, legacy pages, shortcuts) | **Fixed** |
| Discovery lists | `discoveryProjectionService.ts` | **Fixed** |
| Adventure board | `adventureHubController.ts` | **Fixed** |
| Narrative threads / snapshot | `buildCampaignNarrativeSnapshot.ts` | **Fixed** |

---

## Case sensitivity review

| Path | Pattern | Disposition |
|------|---------|-------------|
| `recruitmentMarketplaceController.ts` | In-memory normalized title match for recruitment docs | **Intentional dual-engine** — avoids `mode: 'insensitive'` on SQLite |
| `adminCampaignsController.ts` | `contains` on name/email | **Portable** — case-sensitive on both engines (admin search) |
| `worldDevelopmentService.ts` | `contains` on title/narrative | **Portable** — case-sensitive on both engines |
| `wikiController.ts` | `contains` in search | **Portable** — case-sensitive on both engines |
| `campaignsController.ts`, clone/sample | `startsWith` on handle | **Portable** — exact prefix match |
| `assetAccess.ts`, plugin assets | `endsWith` / `startsWith` on URLs | **Portable** — path suffix match |

No `mode: 'insensitive'` in application code (SQLite-incompatible). Recruitment doc alias matching uses normalized in-memory comparison by design.

---

## CI parity

| Job | Engine | Scope |
|-----|--------|-------|
| `test-sqlite` | SQLite | `prisma generate` (provider sed) + migrate + full backend tests |
| `test-postgres` | PostgreSQL | `prisma generate` + migrate + full backend tests |

Workflow: [`.github/workflows/build.yml`](../../.github/workflows/build.yml)

**Gate before provider default flip:** both jobs green on `main` for several consecutive runs.

---

## Export/import matrix

A-tier rows from [pre-1.0-export-audit.md](./pre-1.0-export-audit.md) falsified via:

```bash
cd backend
npm test -- --test-name-pattern="pre-1.0 export matrix"
```

Runs in both CI jobs (included in backend test suite).

---

## Falsification (local)

**SQLite:**

```bash
cd backend
sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma   # Git Bash / WSL
echo 'DATABASE_URL="file:./portability-test.db"' > .env
npx prisma generate && npx prisma migrate deploy
npm test -- --test-name-pattern="pre-1.0 export matrix"
```

**PostgreSQL:** use `test-postgres` CI job or local Postgres with `DATABASE_URL=postgresql://…`.

---

## Postgres default deployment

| Surface | Default (post-change) |
|---------|----------------------|
| `backend/prisma/schema.prisma` | `provider = "postgresql"` |
| `backend/src/config/env.ts` | `DATABASE_PROVIDER` / URL default to PostgreSQL |
| `docker-compose.yml` | PostgreSQL `DATABASE_URL` fallback |
| `README.md` | PostgreSQL documented as default; SQLite as solo dev path |

SQLite remains first-class for local dev and the `test-sqlite` CI job; Docker Compose uses PostgreSQL only.
