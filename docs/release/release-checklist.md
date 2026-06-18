# Release checklist

Use before tagging **`vX.Y.Z`** on `main`. Adapt sections to the release scope (patch vs minor vs operator-visible Docker changes).

> AI-generated checklists and release-readiness reviews are **advisory only**. See [GOVERNANCE.md](../../GOVERNANCE.md).

> Human verification always supersedes AI analysis.

---

## Pre-tag

### Automated gates

- [ ] Root [`package.json`](../../package.json) `version` bumped to match the tag you will push (`vX.Y.Z` → `X.Y.Z`); release CI fails on mismatch
- [ ] `pnpm install --frozen-lockfile && pnpm run build` passes locally or on the release PR
- [ ] CI green on the commit to be tagged (`build`, `test-sqlite`, `test-postgres`, `docker-build`)
- [ ] GitHub Release notes reviewed after workflow (generated from merged PRs; edit on GitHub if operator-facing detail is needed)
- [ ] No pending schema migrations queued without maintainer review ([migration-audit.md](../audits/migration-audit.md))

### Operator / packaging (when Docker or compose changed)

- [ ] `docker compose config` validates
- [ ] Fresh `docker compose up -d` (or GHCR pull smoke) — login, `/api/health`, wiki edit at `http://localhost:8080`
- [ ] `docker buildx imagetools inspect ghcr.io/esiana-ttrpg/esiana:<tag>` shows `linux/amd64` and `linux/arm64`
- [ ] `docker buildx imagetools inspect docker.io/esiana/esiana:<tag>` shows `linux/amd64` and `linux/arm64`
- [ ] Runtime platform invariants (manifest inspect alone is not sufficient):
  ```bash
  docker run --rm --platform linux/arm64 --entrypoint uname ghcr.io/esiana-ttrpg/esiana:<tag> -m  # → aarch64
  docker run --rm --platform linux/amd64 --entrypoint uname ghcr.io/esiana-ttrpg/esiana:<tag> -m  # → x86_64
  ```
- [ ] Production entrypoint on arm64 does not emit `exec format error` or `ERR_MODULE_NOT_FOUND`
- [ ] Core image starts without optional workspace plugins (`/entrypoint.sh` executable on arm64)
- [ ] Optional S3: install `remote-object-storage` under `/app/plugins`, enable in Admin, verify Admin → Storage healthy
- [ ] No UTF-8 BOM in `docker/*.sh` or `docker/esiana.Dockerfile` (CI gate; see `.gitattributes`)
- [ ] Optional `ESIANA_VERSION` documented for pull-based upgrades ([Environment Variables.md](../deployment/Environment%20Variables.md))
- [ ] Self-hosting docs aligned ([docs/self-hosting/](../../../docs/self-hosting/))

### Data sovereignty (when export/import or schema touched)

- [ ] Export → restore smoke on at least one campaign
- [ ] Relevant rows in [pre-1.0-export-audit.md](../audits/pre-1.0-export-audit.md) matrix considered

### Integrator (when plugin platform or OpenAPI touched)

- [ ] `/api/docs` loads on a running instance
- [ ] Plugin hello-world path still valid ([plugin development](../../../docs/plugin-development/getting-started.md))

---

## Tag and publish

- [ ] Tag `vX.Y.Z` on `main` (triggers [release workflow](../../.github/workflows/release.yml))
- [ ] GitHub Release body includes container image pull instructions
- [ ] Monitor workflow to completion (GHCR + Docker Hub push, runtime smoke, release asset)

---

## Maintainer sign-off

Required before tagging. Do not check solely because AI review said ready.

- [ ] I am a human maintainer and have personally verified the items above (not solely via AI review).
- [ ] I understand migration, export, and Docker impacts for this release.

Maintainer: _________________________ Date: _____________
