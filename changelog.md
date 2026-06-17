# Changelog

## Unreleased

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
