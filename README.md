# Esiana TTRPG Manager

Esiana is a self-hosted, multi-campaign TTRPG worldbuilding and campaign manager designed for Game Masters who want deep lore organization without heavy VTT automation.

[!NOTE]
Project Status: **v1.0.0** (stable baseline)

Esiana ships a schema-frozen production baseline with Postgres default, Docker Compose, and dual-engine CI. Post-1.0 work extends views and plugins over existing tables — see [todo.md](./todo.md). AI assists development and review; [GOVERNANCE.md](./GOVERNANCE.md) requires human maintainer sign-off for merges and releases.

## Features

For upcoming work, see the [development roadmap](./todo.md).

Contributors: [CONTRIBUTING.md](./CONTRIBUTING.md) · [GOVERNANCE.md](./GOVERNANCE.md) · [`.cursor/rules/`](./.cursor/rules/) · [philosophy.md](./philosophy.md) · [design-philosophy.md](./design-philosophy.md)

### Campaign hub & discovery

- Multi-campaign **global hub** with create and join flows
- **Public campaign directory** and slug-based URLs (`/c/:campaignSlug`)
- **Looking-for-group (LFG)** listings and player applications
- Campaign metadata: **game system**, language, visibility, and archive

### Wiki & lore

- **Hierarchical wiki** with category folders and nested pages
- **Block-based pages**: rich text, images, infoboxes, stat blocks, and layout grids
- **Visibility levels**: Public, Party, and DM-only
- **Quick Access**, category index pages, and **backlinks**
- Dedicated **character** routes

### Sessions & notes

- **Session timeline** and per-session notes
- **Notebook arcs**, plus player, session, and tag views
- **Compile session notes** to Markdown; document upload support

### Time & chronology

- **Custom fantasy calendars** (months, moons, leap days, advance time)
- **Chronology hub** combining calendar and timeline views
- JSON calendar import

### Campaign UX

- **Campaign Home** overview (session schedule, world chronometer, bulletin, recent lore, quest ledger, threads, and more)
- **Recent changes** / activity feed
- Customizable **campaign sidebar**

### Platform & admin

- Email/password auth, user profiles, and **developer API tokens**
- **Self-hosted** deployment with SQLite or PostgreSQL
- **Runtime plugins** at instance and per-campaign scope
- **System admin console**: branding, maintenance mode, user management, backups, and API usage analytics

## Monorepo layout

| Path | Stack |
|------|-------|
| `/backend` | Node.js, Express, TypeScript, Prisma |
| `/frontend` | React, Vite, Tailwind CSS, TypeScript |
| `/plugins` | Community plugin packages (loaded at runtime) |

## Quick start

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run db:generate
npm run db:push
npm run dev:backend
```

In another terminal:

```bash
npm run dev:frontend
```

Then open the app at `http://localhost:5173`.

## Documentation wiki

User guides, API docs, plugin author docs, and architecture explainers live in the sibling [`docs/`](../docs/) repo:

- **[Documentation wiki home](../docs/README.md)** — audience routing
- [Campaign model](../docs/architecture/campaign-model.md) — how Esiana thinks about world data
- [API guides](../docs/api/README.md) — human REST docs; **`/api/docs`** on your running instance for endpoints
- [Plugin development](../docs/plugin-development/getting-started.md)
- [Self-hosting](../docs/self-hosting/installation.md) — Docker Compose install (`ghcr.io/esiana-ttrpg/esiana`)
- [Features](../docs/features/README.md) — wiki, sessions, maps, LFG
- [Options](../docs/options/README.md) — env vars, admin settings

Engineering audits and internal platform specs: [`docs/README.md`](./docs/README.md).

### Dev ports & proxy

- **Backend**: defaults to `PORT=3001` (see `backend/.env.example`)
- **Frontend**: Vite runs on `5173` and proxies `/api` + `/uploads` to `VITE_API_PROXY_TARGET`
  - Default in `frontend/.env.example` is `http://localhost:3000`
  - If you keep backend on 3001, set `VITE_API_PROXY_TARGET=http://localhost:3001`

## Database (PostgreSQL or SQLite)

Prisma schema is DB-agnostic at the application layer. The active engine is set by the literal `provider` in `backend/prisma/schema.prisma` (see `backend/prisma/README.md`).

**PostgreSQL (default):** `DATABASE_URL="postgresql://user:password@localhost:5432/esiana"`

**SQLite (solo dev / trial):** set `provider = "sqlite"` in `schema.prisma`, then `DATABASE_URL="file:./dev.db"`.

After changing provider, run `npm run db:generate` and migrate/push.

## Plugins

Drop active modular plugin folders directly under `/plugins`. Packages can be registered, installed, and toggled on the fly using the core API routes (`/api/plugins`). For details on building a custom module extension, review `plugins/README.md`.

## Security

Report vulnerabilities privately — see [SECURITY.md](./SECURITY.md). Dependabot monitors npm dependencies; review and merge dependency PRs like any other change.

## Versioning note

The root [`package.json`](./package.json) `version` field is the **product version** source of truth (currently v1.0.0). It is injected into the admin UI and backend update checks at build/runtime. [changelog.md](./changelog.md) records notable changes by version; [todo.md](./todo.md) tracks the roadmap. **Release process:** merge via reviewed PR to `main`, complete [release checklist](./docs/release/release-checklist.md), tag `vX.Y.Z` — the [release workflow](.github/workflows/release.yml) runs CI, publishes `ghcr.io/esiana-ttrpg/esiana`, and creates the GitHub Release. See [GOVERNANCE.md](./GOVERNANCE.md) for maintainer and AI review policy.

## Third-party assets

- **BLÅHAJ shark art** (error page mascot) — Copyright © 2022 Evangelos "GeopJr" Paterakis, [BSD-2-Clause](https://github.com/GeopJr/BLAHAJ). Source and license: [`frontend/src/assets/blahaj/`](./frontend/src/assets/blahaj/).

---

## Active Milestone Roadmap

We maintain a granular development, framework task, and testing roadmap right in the root of this workspace. Before tackling features, writing backend integration frameworks, or extending data visualization canvases, please review the active development milestones:

📄 **[Review the Project Todo Tracker (`todo.md`)](./todo.md)**