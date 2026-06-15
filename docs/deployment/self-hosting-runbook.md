# Self-hosting runbook (maintainer)

**Operator guide moved:** [docs/self-hosting/](../../../docs/self-hosting/README.md)

This file is a maintainer appendix — RC gates and release verification.

---

## RC verification

- OpenAPI loads at `/api/docs` when `OPENAPI_DOCS_ENABLED` ≠ false
- `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d` — migrations apply automatically via esiana entrypoint
- Smoke: login, wiki edit, sovereign export ZIP at `http://localhost:8080`
- GHCR image is multi-arch (`linux/amd64`, `linux/arm64`):
  `docker buildx imagetools inspect ghcr.io/esiana-ttrpg/esiana:latest`

GHCR: `ghcr.io/esiana-ttrpg/esiana` (optional `ESIANA_VERSION` in `.env` for pinned upgrades)

See [`release/release-checklist.md`](../release/release-checklist.md).

---

## Quick reference

| Topic | Doc wiki |
|-------|----------|
| Install | [self-hosting/installation.md](../../../docs/self-hosting/installation.md) |
| Docker | [self-hosting/docker.md](../../../docs/self-hosting/docker.md) |
| Backups | [self-hosting/backups.md](../../../docs/self-hosting/backups.md) |
| Upgrades | [self-hosting/upgrades.md](../../../docs/self-hosting/upgrades.md) |
| Env vars | [Environment Variables.md](Environment%20Variables.md) |

API docs: `/api/docs` on your public origin (via nginx proxy; version-locked to running instance)
