# Reverse Proxies

Esiana serves HTTP on **port 80 inside the container**. The official [`docker-compose.yml`](../../docker-compose.yml) maps that to **host port 8080** — no reverse proxy required for local or LAN use.

For HTTPS, a public hostname, or integration with existing infrastructure, terminate TLS at your reverse proxy and forward to Esiana. Esiana does not ship or require any particular proxy.

---

## Before you proxy

1. Confirm Esiana works directly: `docker compose up -d` → http://localhost:8080
2. Set **`PUBLIC_ORIGIN`** in `.env` to your public URL (no trailing slash), e.g. `https://esiana.example.com`
3. Set **`TRUST_PROXY=true`** on the `esiana` service when the proxy sets `X-Forwarded-*` headers (required for correct client IP in rate limits)
4. Set **`COOKIE_SECURE=true`** when serving only over HTTPS (add to `esiana` `environment` in compose or `.env` if you pass it through)

`PUBLIC_ORIGIN` sets `FRONTEND_ORIGIN`, `CORS_ORIGIN`, and `BACKEND_PUBLIC_ORIGIN` via compose defaults. OIDC and email links need the correct public URL.

---

## General pattern

```text
Browser ──HTTPS──► Reverse proxy ──HTTP──► esiana:80 (container)
                              └── optional ──► postgres (internal only)
```

- Proxy **to the esiana container** on port **80** (not Postgres).
- Esiana's internal nginx serves the SPA and proxies `/api` and `/uploads` to the Node backend.
- You may remove the `ports:` mapping from compose once the proxy reaches Esiana on the Docker network (advanced).

---

## Caddy (standalone)

`Caddyfile` on the host proxying to published port 8080:

```caddyfile
esiana.example.com {
    reverse_proxy localhost:8080
}
```

With `PUBLIC_ORIGIN=https://esiana.example.com` and `TRUST_PROXY=true` on the esiana service.

---

## Caddy Docker Proxy

If you run [Caddy Docker Proxy](https://github.com/lucaslorentz/caddy-docker-proxy), add labels to the **esiana** service and attach it to your Caddy network. Remove or comment out the `ports:` block if Caddy routes traffic on the Docker network.

```yaml
services:
  esiana:
    # ...
    environment:
      TRUST_PROXY: "true"
      COOKIE_SECURE: "true"
    labels:
      caddy: esiana.example.com
      caddy.reverse_proxy: "{{upstreams 80}}"
    networks:
      - default
      - caddy

networks:
  caddy:
    external: true
```

Set `PUBLIC_ORIGIN=https://esiana.example.com` in `.env`. Create the network once: `docker network create caddy`.

---

## nginx

```nginx
server {
    listen 443 ssl http2;
    server_name esiana.example.com;

    # ssl_certificate ...;
    # ssl_certificate_key ...;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Set `PUBLIC_ORIGIN=https://esiana.example.com` and `TRUST_PROXY=true` on esiana.

---

## Traefik (Docker labels)

Attach esiana to your Traefik network and add labels (Traefik v2 style):

```yaml
services:
  esiana:
    labels:
      - traefik.enable=true
      - traefik.http.routers.esiana.rule=Host(`esiana.example.com`)
      - traefik.http.routers.esiana.entrypoints=websecure
      - traefik.http.routers.esiana.tls.certresolver=letsencrypt
      - traefik.http.services.esiana.loadbalancer.server.port=80
    networks:
      - default
      - traefik
```

Adjust entrypoints, cert resolver, and network name to match your Traefik stack.

---

## Cloudflare Tunnel

Point the tunnel at `http://localhost:8080` (or `http://esiana:80` from a cloudflared container on the same Compose network). Set `PUBLIC_ORIGIN` to your public hostname and `TRUST_PROXY=true`.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| CORS errors | `PUBLIC_ORIGIN` / `CORS_ORIGIN` must match the browser URL |
| Login cookie not set | `COOKIE_SECURE=true` requires HTTPS; match `PUBLIC_ORIGIN` scheme |
| Wrong client IP in logs | `TRUST_PROXY=true` behind the proxy |
| OIDC redirect mismatch | `BACKEND_PUBLIC_ORIGIN` / `PUBLIC_ORIGIN` must match IdP callback URL |
| 502 from proxy | Esiana healthy? `docker compose logs esiana` — migrations still running? |

---

## Related docs

- [Docker Compose.md](Docker%20Compose.md) — official quick start
- [Environment Variables.md](Environment%20Variables.md) — `PUBLIC_ORIGIN`, `TRUST_PROXY`, `COOKIE_SECURE`
