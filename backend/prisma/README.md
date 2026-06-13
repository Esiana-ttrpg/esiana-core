# Prisma / database notes

Default provider in `schema.prisma` is **postgresql**. For local SQLite dev, set `provider = "sqlite"` and `DATABASE_URL="file:./dev.db"`, then `npm run db:generate`.

## Plugin registry URL (existing local databases)

Fresh installs pick up the default from `schema.prisma` (`pluginRegistryUrl` on `SystemSetting`).

If your dev database was created before the **esiana-ttrpg/community-plugins** registry, run:

```bash
# from repository root
npm run db:migrate-registry-url
```

That updates `GLOBAL_CONFIG` only when `pluginRegistryUrl` still matches a legacy placeholder (for example `esiana-app/core-plugins`). Custom URLs you set in Admin → Plugins are left unchanged.

Manual SQL (SQLite example):

```sql
UPDATE SystemSetting
SET pluginRegistryUrl = 'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/registry.json'
WHERE id = 'GLOBAL_CONFIG'
  AND pluginRegistryUrl = 'https://raw.githubusercontent.com/esiana-app/core-plugins/main/registry.json';
```

After schema changes: `npm run db:push` (or `db:migrate`), then restart the backend so Prisma Client reloads.
