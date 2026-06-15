# Self-hosting runbook (maintainer)

**Operator guide:** [Docker Compose.md](Docker%20Compose.md) · [docs/self-hosting/](../../../docs/self-hosting/)

Maintainer appendix — RC gates and release verification.

---

## RC verification

- OpenAPI loads at `/api/docs` when `OPENAPI_DOCS_ENABLED` ≠ false
- `docker compose up -d` — migrations apply automatically via esiana entrypoint
- Smoke: login, wiki edit, sovereign export ZIP at `http://localhost:8080`
- GHCR image is multi-arch (`linux/amd64`, `linux/arm64`):
  `docker buildx imagetools inspect ghcr.io/esiana-ttrpg/esiana:latest`

GHCR: `ghcr.io/esiana-ttrpg/esiana` (optional `ESIANA_VERSION` in `.env` for pinned upgrades)

See [`release/release-checklist.md`](../release/release-checklist.md).

---

## Quick reference

| Topic | Doc |
|-------|-----|
| Install | [Docker Compose.md](Docker%20Compose.md) |
| Reverse proxy | [Reverse Proxies.md](Reverse%20Proxies.md) |
| Env vars | [Environment Variables.md](Environment%20Variables.md) |
| Backups | [self-hosting/backups.md](../../../docs/self-hosting/backups.md) |
| Upgrades | [self-hosting/upgrades.md](../../../docs/self-hosting/upgrades.md) |

API docs: `http://localhost:8080/api/docs` (via nginx proxy; version-locked to running instance)
