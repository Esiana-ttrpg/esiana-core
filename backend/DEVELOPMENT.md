# Backend development

Area-specific guidance for `/backend`. General setup, CI, and branch workflow: [../DEVELOPMENT.md](../DEVELOPMENT.md).

---

## Prisma conventions

- Default provider in `schema.prisma` is **postgresql**; SQLite is supported for solo dev
- Migrations and queries must stay portable — no PostgreSQL-only or SQLite-only SQL, triggers, or engine-specific behavior
- After schema changes: `npm run db:generate` (from repo root), then `db:push` or `db:migrate`, then restart the backend

References:

- [prisma/README.md](./prisma/README.md) — provider switching, registry URL migration
- [engineeringprinciples.md](../engineeringprinciples.md) — database agnosticism
- [docs/audits/database-portability-audit.md](../docs/audits/database-portability-audit.md)
- [docs/audits/migration-audit.md](../docs/audits/migration-audit.md) — schema change review

---

## Tenant isolation

Campaigns are isolated tenants. Every campaign-scoped change must:

1. Establish campaign scope via middleware (`resolveCampaignScope`, `attachCampaignByIdParam`)
2. Enforce membership or stronger capability before mutations
3. Include `campaignId` in Prisma reads/writes (directly or via a validated parent join)
4. Prefer **404** over **403** when a resource ID exists in another campaign

```typescript
// Good — scoped mutation
const page = await prisma.wikiPage.findFirst({ where: { id, campaignId } });
if (!page) return res.status(404).end();

// Bad — id-only update (cross-tenant risk)
await prisma.wikiPage.update({ where: { id }, data });
```

Full audit: [docs/security/tenant-isolation-audit.md](../docs/security/tenant-isolation-audit.md)

---

## Service and controller patterns

- **API-first:** expose behavior through stable REST routes; OpenAPI at `/api/docs` on a running instance
- **Route flow:** scope middleware → membership/capability check → Zod validation → service function with explicit `campaignId`
- **Persistence:** controller re-validates after plugin interceptors; Prisma writes stay in services
- **Spec:** [openapi/openapi.yaml](./openapi/openapi.yaml) · maintainer docs: [docs/README.md](../docs/README.md)

Match existing controllers and services in `backend/src/` before introducing new abstractions.

---

## Testing

From `backend/`:

```bash
npm test
```

CI runs the full suite against SQLite and PostgreSQL. Add `*.test.ts` beside the module under test when behavior changes.

Focus tests on:

- Tenant boundaries and authorization gates
- Migration/portability-sensitive logic
- Service invariants and regression fixes
