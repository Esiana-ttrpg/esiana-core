# Self-hosting runbook (maintainer)

**Operator guide moved:** [docs/self-hosting/](../../../docs/self-hosting/README.md)

This file is a maintainer appendix — RC gates and release verification.

---

## RC verification

- OpenAPI loads at `/api/docs` when `OPENAPI_DOCS_ENABLED` ≠ false
- `docker compose up -d --build` — migrations apply automatically via backend entrypoint
- Smoke: login, wiki edit, sovereign export ZIP

See [`release/pre-1.0-rc-checklist.md`](../release/pre-1.0-rc-checklist.md).

---

## Quick reference

| Topic | Doc wiki |
|-------|----------|
| Install | [self-hosting/installation.md](../../../docs/self-hosting/installation.md) |
| Docker | [self-hosting/docker.md](../../../docs/self-hosting/docker.md) |
| Backups | [self-hosting/backups.md](../../../docs/self-hosting/backups.md) |
| Upgrades | [self-hosting/upgrades.md](../../../docs/self-hosting/upgrades.md) |
| Env vars | [options/environment-variables.md](../../../docs/options/environment-variables.md) |

API docs: `http://localhost:3001/api/docs` (version-locked to running instance)
