# Development guide

Technical setup and workflow for contributors. For onboarding and contribution expectations, see [CONTRIBUTING.md](./CONTRIBUTING.md).

Extended install notes: [../docs/options/installation.md](../docs/options/installation.md)

---

## Setup

### Requirements

- Node.js ≥ 20
- pnpm 9 (via Corepack — see `packageManager` in [package.json](./package.json))
- PostgreSQL (default) or SQLite for solo dev

### Quick start

From the `esiana-core` root:

```bash
corepack enable
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
pnpm run db:generate
pnpm run db:push
```

Terminal 1 — backend:

```bash
pnpm run dev:backend
```

Terminal 2 — frontend:

```bash
pnpm run dev:frontend
```

Open **http://localhost:5173**.

### Ports and proxy

- Backend defaults to **PORT=3001** (`backend/.env.example`)
- Vite runs on **5173** and proxies `/api` + `/uploads` to `VITE_API_PROXY_TARGET`
- If backend stays on 3001, set `VITE_API_PROXY_TARGET=http://localhost:3001` in `frontend/.env`

### Repository layout

| Path | Purpose |
|------|---------|
| `/backend` | Node.js, Express, TypeScript, Prisma |
| `/frontend` | React, Vite, Tailwind CSS, TypeScript |
| `/shared` | Cross-workspace types and helpers |
| `/plugins` | Runtime plugin directory (symlinked packages in dev) |
| `/docs` | In-repo engineering audits and internal specs |
| `../docs` | Documentation wiki (features, API, self-hosting, plugin development) |
| `../community-plugins` | Official plugin catalog (sibling repo) |

### Plugins

Check out [`community-plugins`](../community-plugins) beside `esiana-core`, then:

```bash
pnpm run plugins:link
```

Restart the backend after manifest changes. See [plugins/README.md](./plugins/README.md) and [../docs/plugin-development/getting-started.md](../docs/plugin-development/getting-started.md).

### Area-specific guides

- [backend/DEVELOPMENT.md](./backend/DEVELOPMENT.md) — Prisma, tenant isolation, API patterns, backend tests
- [frontend/DEVELOPMENT.md](./frontend/DEVELOPMENT.md) — components, design tokens, surfaces, accessibility

---

## Commands

Root scripts from [package.json](./package.json):

| Script | Purpose |
|--------|---------|
| `pnpm run dev:backend` | Start backend dev server |
| `pnpm run dev:frontend` | Start Vite dev server |
| `pnpm run build` | Build all workspaces |
| `pnpm run db:generate` | Regenerate Prisma client |
| `pnpm run db:push` | Push schema to local database |
| `pnpm run db:migrate` | Run migrations |
| `pnpm run plugins:link` | Symlink sibling `community-plugins` packages |
| `pnpm run seed-campaign` | Run campaign seeder CLI |

---

## Testing

Backend tests (from repo root):

```bash
cd backend && pnpm test
```

Add or update tests when you change behavior, tenant isolation, or migrations. Co-locate `*.test.ts` files with the modules they cover.

---

## Database workflow

The active engine is the literal `provider` in `backend/prisma/schema.prisma`. See [backend/prisma/README.md](./backend/prisma/README.md) for Postgres vs SQLite switching.

After changing provider or schema:

```bash
pnpm run db:generate
pnpm run db:push   # or db:migrate
```

Restart the backend so Prisma Client reloads.

Schema changes require maintainer review — see [docs/audits/migration-audit.md](./docs/audits/migration-audit.md).

---

## Docker

Local compose smoke (matches CI `docker-build` job):

```bash
docker compose config --quiet
docker build -f docker/esiana.Dockerfile -t esiana:local .
```

Operator deployment: [../docs/self-hosting/docker.md](../docs/self-hosting/docker.md) · [docs/deployment/self-hosting-runbook.md](./docs/deployment/self-hosting-runbook.md)

---

## Branch strategy

- `develop` is the primary development branch
- Feature work targets `develop`
- `main` represents release-ready code
- Releases merge `develop` into `main` and tag `vX.Y.Z`

Full steward and merge rules: [GOVERNANCE.md](./GOVERNANCE.md).

---

## CI expectations

[`.github/workflows/build.yml`](./.github/workflows/build.yml) runs on pull requests to `main` and `develop`:

| Job | What it checks |
|-----|----------------|
| `build` | `pnpm install`, Prisma generate, workspace build |
| `test-sqlite` | SQLite migrate deploy + backend test suite |
| `test-postgres` | Baseline migration validation + Postgres migrate deploy + backend tests |
| `docker-build` | `docker compose config` + amd64 image build (Buildx + GHA cache) |

All checks must pass before merge.

Campaign-scoped routes must include tenant isolation (`campaignId` in reads/writes). See [docs/security/tenant-isolation-audit.md](./docs/security/tenant-isolation-audit.md).

User-facing release notes belong on [GitHub Releases](https://github.com/Esiana-ttrpg/esiana-core/releases). Deferred scope: [docs/deferred-backlog.md](./docs/deferred-backlog.md).

Do not commit secrets (`.env`, credentials, local databases).

---

## Maintainer release

Release authority and tagging rules: [GOVERNANCE.md](./GOVERNANCE.md).

Before tagging `vX.Y.Z` on `main`:

1. Review and edit GitHub Release notes after the workflow runs (generated from merged PRs since the previous tag)
2. Complete [docs/release/release-checklist.md](./docs/release/release-checklist.md) with human maintainer attestation
3. Tag on `main` — the [release workflow](.github/workflows/release.yml) publishes GHCR images (required), mirrors to Docker Hub (best effort), and creates the GitHub Release
