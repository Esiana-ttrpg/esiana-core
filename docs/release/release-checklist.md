# Release checklist

Use before tagging **`vX.Y.Z`** on `main`. Adapt sections to the release scope (patch vs minor vs operator-visible Docker changes).

> AI-generated checklists and release-readiness reviews are **advisory only**. See [GOVERNANCE.md](../../GOVERNANCE.md).

> Human verification always supersedes AI analysis.

---

## Pre-tag

### Automated gates

- [ ] `npm ci && npm run build` passes locally or on the release PR
- [ ] CI green on the commit to be tagged (`build`, `test-sqlite`, `test-postgres`, `docker-build`)
- [ ] GitHub Release notes reviewed after workflow (generated from merged PRs; edit on GitHub if operator-facing detail is needed)
- [ ] No pending schema migrations queued without maintainer review ([migration-audit.md](../audits/migration-audit.md))

### Operator / packaging (when Docker or compose changed)

- [ ] `docker compose config` validates (production and local override)
- [ ] Fresh `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d` (or GHCR pull smoke) — login, `/api/health`, wiki edit
- [ ] `docker buildx imagetools inspect ghcr.io/esiana-ttrpg/esiana:<tag>` shows `linux/amd64` and `linux/arm64`
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
- [ ] Monitor workflow to completion (GHCR push + release asset)

---

## Maintainer sign-off

Required before tagging. Do not check solely because AI review said ready.

- [ ] I am a human maintainer and have personally verified the items above (not solely via AI review).
- [ ] I understand migration, export, and Docker impacts for this release.

Maintainer: _________________________ Date: _____________
