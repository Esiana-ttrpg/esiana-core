# Changelog

## Unreleased

## [1.2.0] - 2026-06-21

### Added

- **Kanka JSON import** — New Campaign Wizard path for Kanka exports: character field mapping, HTML-to-Markdown, mention resolution, maps, campaign banner, and idempotent re-import. Closes [#98](https://github.com/Esiana-ttrpg/esiana-core/issues/98).
- **Wiki markdown import** — Paste or upload Markdown when creating a wiki page from the create-page modal. Closes [#80](https://github.com/Esiana-ttrpg/esiana-core/issues/80).
- **UI locale foundation (i18n)** — Domain-first translation tree, `User.uiLocale` preference, and phased migration of shell, workspace chrome, notifications, and community locale infrastructure (Phases 1–4).
- **Plugin registry provenance** — Registry-backed catalog with provenance model; core no longer vendors community catalog packages. Admin plugin table + inspector, Plugin Sources drawer, and discovery catalog with hide-installed filter.
- **Content pack campaign cover** — Campaign cover image from content pack `campaign.json` (`coverImageAssetId`).
- **Admin update visibility** — Surface core update availability in System Config (from `main` delta).

### Changed

- **AGENTS.md** — Consolidated agent policy and GitHub ruleset references.
- Plugin engine mismatch surfaced in admin UI; enable returns 409 when `engines.esiana-core` does not match.
- SQLite local dev: Prisma deploy wiring and documented engine paths.

### Fixed

- **Obsidian importer** — Route imports into typed wiki hubs. Closes [#78](https://github.com/Esiana-ttrpg/esiana-core/issues/78).
- **Workshop navigation** — Unblock leaving the Workshop section. Closes [#79](https://github.com/Esiana-ttrpg/esiana-core/issues/79).
- **Campaign visibility** — Unified campaign actor construction and private page access.
- **Sidebar collapse** — Full-height edge rail; widen rail and fix first-click toggle.
- Vite API proxy defaults to backend port 3001 for local dev.
- `ESIANA_CORE_VERSION` optional override; `backend/.env` wins over stale shell env.

### Database

- Migration `20260618120000_user_ui_locale` — adds `User.uiLocale` for UI locale preference.

## [1.1.0] - 2026-06-17

### Breaking

- **S3 storage** — Removed `@esiana/storage-s3` from the core monorepo and Docker image. Install the **`remote-object-storage`** community plugin under `PLUGINS_DIR` and enable it in Admin when using `STORAGE_PROVIDER=s3-compatible`. Closes [#86](https://github.com/Esiana-ttrpg/esiana-core/issues/86).

### Added

- **Admin live task queue** — Split active, scheduled, failures, and paginated history views so cron runs stop flooding the live table and failures get a dedicated attention surface. Closes [#76](https://github.com/Esiana-ttrpg/esiana-core/issues/76).

### Changed

- Slimmer Docker runtime image via `pnpm deploy`
- Docker startup banner and runtime metadata in entrypoint

### Fixed

- SSRF `networkFetch` boundary and CodeQL guards for outbound fetch
- Campaign wizard uploads and PostgreSQL category index queries
- Admin Sample Data nav hidden when `ENABLE_SAMPLE_DATA` is off
- CI and Docker build hardening (pnpm lockfile guard, Prisma client in deploy bundle)

Release history is published on [GitHub Releases](https://github.com/Esiana-ttrpg/esiana-core/releases).

Archived changelog (through v1.0.1): [docs/archive/changelog-through-1.0.1.md](docs/archive/changelog-through-1.0.1.md)
