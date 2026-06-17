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
| **esiana** | `ghcr.io/esiana-ttrpg/esiana` | Node API + nginx web delivery layer (single container; nginx on by default) |
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

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `exec /entrypoint.sh: exec format error` on arm64 | **v1.0.5–v1.0.6:** UTF-8 BOM before shebang in entrypoint; kernel cannot exec `/entrypoint.sh`. **Older tags:** amd64-only image on arm64 host | Upgrade to **v1.0.7+**. Verify runtime (not just manifest): `docker run --rm --platform linux/arm64 --entrypoint uname ghcr.io/esiana-ttrpg/esiana:latest -m` → `aarch64`. **v1.0.6 workaround:** add `entrypoint: ["/bin/sh", "/entrypoint.sh"]` in `docker-compose.override.yml`. Do not add `platform: linux/amd64` unless you have QEMU/binfmt emulation installed. |
| `no matching manifest for linux/arm64` | Tagged release predates multi-arch publishing | Pull `v1.0.2` or later, or `latest` after the multi-arch release ships |
| `ERR_MODULE_NOT_FOUND: @esiana/storage-s3` | Legacy **v1.0.6–v1.0.7** workspace packaging in Docker images | Upgrade to current release. S3 is provided by the **`remote-object-storage`** community plugin under `/app/plugins`, not the core image. |
| CORS errors | `PUBLIC_ORIGIN` does not match browser URL | Set `PUBLIC_ORIGIN` in `.env` to your public URL — see [Reverse Proxies.md](Reverse%20Proxies.md) |
| Login cookie not set | `COOKIE_SECURE=true` over plain HTTP | Use HTTPS or set `COOKIE_SECURE=false` for local HTTP only |
| Postgres restart loop | `POSTGRES_PASSWORD` missing from `.env` | Copy `.env.example` and set required secrets |
| Blank page / API errors | Migrations failed on startup | `docker compose logs esiana` |
| `"server" directive is not allowed here` in esiana logs | `server {}` placed in Alpine global `conf.d/` (pre-v1.0.5 image) | Pull/rebuild **v1.0.5+**; site config belongs in `http.d/` only |
| SPA blank but `/api/health` works | Web delivery layer (nginx) failed; API still running | `docker compose logs esiana`; check nginx warnings; set `ENABLE_INTERNAL_NGINX=true` |

---

## Related docs

- [Environment Variables.md](Environment%20Variables.md) — every supported variable
- [Reverse Proxies.md](Reverse%20Proxies.md) — HTTPS and public hostname setup
- [self-hosting-runbook.md](self-hosting-runbook.md) — maintainer RC verification
- [Object storage](object-storage.md) — optional S3-compatible uploads
