# Changelog

## Unreleased

### Breaking

- **S3 storage** — Removed `@esiana/storage-s3` from the core monorepo and Docker image. Install the **`remote-object-storage`** community plugin under `PLUGINS_DIR` and enable it in Admin when using `STORAGE_PROVIDER=s3-compatible`. Closes [#86](https://github.com/Esiana-ttrpg/esiana-core/issues/86).

Release history is published on [GitHub Releases](https://github.com/Esiana-ttrpg/esiana-core/releases).

Archived changelog (through v1.0.1): [docs/archive/changelog-through-1.0.1.md](docs/archive/changelog-through-1.0.1.md)
