# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest release tag on `main` | Yes |
| `main` branch (self-built) | Best-effort |
| Older tagged releases | Security fixes at maintainer discretion — upgrade recommended |

Product version is defined in [`package.json`](./package.json).

---

## Reporting a vulnerability

**Do not** open public GitHub issues for security vulnerabilities.

Report privately via [GitHub Security Advisories](https://github.com/Esiana-ttrpg/esiana-core/security/advisories/new) for this repository.

Include:

- Affected version or commit
- Reproduction steps or proof of concept
- Impact assessment (tenant isolation, auth bypass, data exposure, etc.)
- Suggested fix if you have one

We aim to acknowledge reports within **5 business days**. Coordinated disclosure timelines depend on severity and fix complexity.

---

## Scope

**In scope**

- esiana-core (backend, frontend, shared packages shipped in the monorepo)
- Official release container image `ghcr.io/esiana-ttrpg/esiana`
- Tenant isolation, authentication, authorization, and export/import integrity

**Out of scope**

- Third-party plugins from `community-plugins` or custom manifests (report to plugin author; core sandbox issues are in scope)
- Self-hosted misconfiguration (weak passwords, exposed `.env`, missing HTTPS)
- Denial-of-service without demonstrated exploit against default deployment sizing

---

## Security practices

- Campaign data is tenant-isolated by `campaignId` — report any cross-campaign read/write as critical.
- Plugins run with declared capabilities; undeclared access should be rejected by the host.
- Dependabot monitors npm dependencies in this repository.

See [GOVERNANCE.md](./GOVERNANCE.md) for maintainer review policy.
