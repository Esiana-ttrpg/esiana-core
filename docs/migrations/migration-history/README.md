# Migration history archive (pre-v1.0)

Before v1.0.0 schema freeze, Esiana maintained **78 incremental Prisma migrations** beginning with partial baselines:

- `20260527214000_baseline_core_schema`
- `20260527215000_baseline_system_setting`

These folders remain in [`backend/prisma/migrations/`](../../backend/prisma/migrations/) until squash execution documented in [migration-audit.md](./migration-audit.md).

After squash, this directory holds **read-only copies** of superseded migration SQL for archaeology — not applied on fresh installs.

Do not edit archived SQL except to add explanatory README notes.
