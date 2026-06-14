# Contributing to Esiana

Thank you for helping improve Esiana — a self-hosted narrative infrastructure platform for long-form TTRPG campaigns.

**Governance:** [GOVERNANCE.md](./GOVERNANCE.md) · **Roadmap:** [todo.md](./todo.md) · **Local dev (full detail):** [docs/options/installation.md](../docs/options/installation.md)

---

## Before you start

Read [philosophy.md](./philosophy.md) and [design-philosophy.md](./design-philosophy.md). Esiana is campaign narrative infrastructure, not a VTT replacement.

AI contributors: see [`.cursor/rules/`](./.cursor/rules/) for product identity and engineering guardrails.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `/backend` | Node.js, Express, TypeScript, Prisma |
| `/frontend` | React, Vite, Tailwind CSS, TypeScript |
| `/shared` | Cross-workspace types and helpers |
| `/plugins` | Runtime plugin directory (symlinked packages in dev) |
| `/docs` | In-repo engineering audits and internal specs |
| `../docs` | Documentation wiki (features, API, self-hosting, plugin development) |
| `../community-plugins` | Official plugin catalog (sibling repo) |

---

## Local development

### Requirements

- Node.js ≥ 20
- npm (workspaces monorepo)
- PostgreSQL (default) or SQLite for solo dev

### Quick start

From the `esiana-core` root:

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run db:generate
npm run db:push
```

Terminal 1 — backend:

```bash
npm run dev:backend
```

Terminal 2 — frontend:

```bash
npm run dev:frontend
```

Open **http://localhost:5173**.

### Ports and proxy

- Backend defaults to **PORT=3001** (`backend/.env.example`)
- Vite runs on **5173** and proxies `/api` + `/uploads` to `VITE_API_PROXY_TARGET`
- If backend stays on 3001, set `VITE_API_PROXY_TARGET=http://localhost:3001` in `frontend/.env`

### Database provider

The active engine is the literal `provider` in `backend/prisma/schema.prisma`. See [backend/prisma/README.md](./backend/prisma/README.md) for Postgres vs SQLite switching.

After changing provider: `npm run db:generate` and migrate/push.

### Plugins

Check out [`community-plugins`](../community-plugins) beside `esiana-core`, then:

```bash
npm run plugins:link
```

Restart the backend after manifest changes. See [plugins/README.md](./plugins/README.md) and [docs/plugin-development/getting-started.md](../docs/plugin-development/getting-started.md).

---

## Tests and CI

Backend tests (from repo root):

```bash
cd backend && npm test
```

CI runs on pull requests to `main` / `develop`: build, SQLite test suite, Postgres test suite, and Docker compose build. All checks must pass before merge.

---

## Pull requests

1. Keep scope focused — one logical change per PR when possible.
2. Campaign-scoped routes must include tenant isolation (`campaignId` in reads/writes). See [docs/security/tenant-isolation-audit.md](./docs/security/tenant-isolation-audit.md).
3. User-facing releases belong in [changelog.md](./changelog.md); deferred scope in [docs/deferred-backlog.md](./docs/deferred-backlog.md).
4. Do not commit secrets (`.env`, credentials, local databases).

Dependabot PRs (when enabled): review dependency diffs like any other change.

Report bugs and feature ideas via GitHub issue templates. Security vulnerabilities: [SECURITY.md](./SECURITY.md) (private advisory — not public issues).

---

## AI Review Policy (summary)

AI-assisted review is welcome as **input**, not as approval authority. Full policy: [GOVERNANCE.md](./GOVERNANCE.md).

```text
AI reviews are informational and do not satisfy any required-reviewer
branch protection rules.
```

> Human verification always supersedes AI analysis.

No pull request may be merged solely on the basis of AI review. A human maintainer must verify the implementation, CI, tests, and release/migration impact.

---

## Release process

1. Merge to `main` via reviewed PR.
2. Update [changelog.md](./changelog.md) `[Unreleased]` (or version section).
3. Complete [docs/release/release-checklist.md](./docs/release/release-checklist.md) with human maintainer attestation.
4. Tag `vX.Y.Z` on `main` — the [release workflow](.github/workflows/release.yml) runs CI, publishes GHCR images, and creates the GitHub Release.

Self-hosting operators: [docs/self-hosting/installation.md](../docs/self-hosting/installation.md).
