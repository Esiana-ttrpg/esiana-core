# Docker Compose

Official self-hosted deployment for Esiana. No reverse proxy, domain, or external network required.

---

## Quick start

**Prerequisites:** Docker 24+ and Docker Compose v2.

```bash
git clone https://github.com/Esiana-ttrpg/esiana-core.git
cd esiana-core
cp .env.example .env
```

Edit `.env` and set:

- `POSTGRES_PASSWORD` — database password
- `JWT_SECRET` — session signing secret (`openssl rand -hex 32`)

Start:

```bash
docker compose up -d
```

Open **http://localhost:8080**, register, and use Esiana. The first account becomes system admin.

---

## What runs

| Service | Image | Role |
|---------|-------|------|
| **esiana** | `ghcr.io/esiana-ttrpg/esiana` | nginx + API + SPA (single container) |
| **postgres** | `postgres:16-alpine` | Database |

Esiana waits for Postgres to pass `pg_isready` before starting. Migrations run automatically on container start.

---

## Volumes

| Volume | Contents |
|--------|----------|
| `pgdata` | PostgreSQL data |
| `uploads` | Maps and media |
| `plugins` | Runtime plugin packages |

Data survives `docker compose down`. Use `docker compose down -v` only when you intend to wipe data.

---

## Useful commands

```bash
docker compose pull          # upgrade image (pin ESIANA_VERSION in .env first)
docker compose up -d         # start or recreate after config change
docker compose logs -f esiana
docker compose ps
docker compose down          # stop; volumes preserved
```

---

## Optional configuration

Only `POSTGRES_PASSWORD` and `JWT_SECRET` are required in `.env`. Common optional overrides:

| Variable | Purpose |
|----------|---------|
| `ESIANA_VERSION` | Pin GHCR tag (e.g. `v1.0.1`) instead of `latest` |
| `COMPOSE_HTTP_PORT` | Change host port (default `8080`) |
| `PUBLIC_ORIGIN` | Public URL when not using `http://localhost:8080` |

Full reference: [Environment Variables.md](Environment%20Variables.md).

---

## HTTPS and public access

The official compose exposes port **8080** on the host. For production HTTPS, put Esiana behind whatever reverse proxy you already use — Caddy, nginx, Traefik, NPM, SWAG, Cloudflare Tunnel, etc.

See [Reverse Proxies.md](Reverse%20Proxies.md) for examples. Esiana does not require any specific proxy.

---

## Related docs

- [Environment Variables.md](Environment%20Variables.md) — every supported variable
- [Reverse Proxies.md](Reverse%20Proxies.md) — HTTPS and public hostname setup
- [self-hosting-runbook.md](self-hosting-runbook.md) — maintainer RC verification
- [Object storage](object-storage.md) — optional S3-compatible uploads
