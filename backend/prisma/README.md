# Prisma / database notes

Committed defaults target **PostgreSQL** (`schema.prisma` `provider = "postgresql"`, baseline migration SQL uses `TIMESTAMP(3)` and `JSONB`). SQLite is supported for solo local dev via a deploy-time type patch — see below.

Full setup paths: [../DEVELOPMENT.md](../DEVELOPMENT.md) · [../../DEVELOPMENT.md](../../DEVELOPMENT.md#database-postgresql-vs-sqlite).

---

## PostgreSQL (default)

1. `backend/.env`: `DATABASE_URL="postgresql://…"` and `DATABASE_PROVIDER=postgresql`
2. Leave `provider = "postgresql"` in `schema.prisma` (do not commit a sqlite switch).
3. From repo root:

```bash
pnpm run db:generate
pnpm run db:migrate:deploy   # or db:migrate for interactive dev migrations
```

Use `db:push` only on disposable Postgres dev databases when iterating on schema before a migration — not for SQLite.

---

## SQLite (solo local dev)

Prisma requires a **literal** `provider = "sqlite"` in `schema.prisma` for the CLI. That change is **local only** — do not commit it on feature branches unless maintainers explicitly change the repo default.

1. Set `provider = "sqlite"` in `schema.prisma` (local edit).
2. `backend/.env`:

```env
DATABASE_URL="file:./dev.db"
DATABASE_PROVIDER=sqlite
```

3. From repo root:

```bash
pnpm run db:generate
pnpm run db:migrate:deploy:sqlite
```

**Do not** use `db:push` or plain `db:migrate:deploy` on SQLite. Committed migration SQL is Postgres-normalized; Prisma's SQLite client cannot read/write columns declared as `TIMESTAMP(3)` or `JSONB`. The [`deploy-sqlite-migrations.mjs`](./scripts/deploy-sqlite-migrations.mjs) script rewrites those types to `DATETIME` and `TEXT` in a staging copy, runs `migrate deploy`, and restores committed files.

| Command | Effect |
|---------|--------|
| `pnpm run db:migrate:deploy:sqlite` | Reset `dev.db` and apply all migrations (first-time / broken DB recovery) |
| `node prisma/scripts/deploy-sqlite-migrations.mjs` | Apply pending migrations without deleting `dev.db` (from `backend/`) |

After schema changes from `develop`: regenerate the client, redeploy with the SQLite script, restart the backend.

---

## Plugin registry URL (existing local databases)

Fresh installs pick up the default from `schema.prisma` (`pluginRegistryUrl` on `SystemSetting`).

If your dev database was created before the **esiana-ttrpg/community-plugins** registry, run:

```bash
# from repository root
pnpm run db:migrate-registry-url
```

That updates `GLOBAL_CONFIG` only when `pluginRegistryUrl` still matches a legacy placeholder (for example `esiana-app/core-plugins`). Custom URLs you set in Admin → Plugins are left unchanged.

Manual SQL (SQLite example):

```sql
UPDATE SystemSetting
SET pluginRegistryUrl = 'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/registry.json'
WHERE id = 'GLOBAL_CONFIG'
  AND pluginRegistryUrl = 'https://raw.githubusercontent.com/esiana-app/core-plugins/main/registry.json';
```
