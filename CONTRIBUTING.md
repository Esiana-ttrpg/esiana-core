# Contributing to Esiana

Thanks for your interest in Esiana.

Esiana is a self-hosted campaign management and worldbuilding platform focused on narrative continuity, knowledge management, and long-running tabletop RPG campaigns.

Whether you're fixing a bug, improving documentation, proposing a feature, or contributing code, you're welcome here.

## Ways to contribute

Contributions aren't limited to code.

We welcome:

- Bug reports
- Documentation improvements
- UI and UX feedback
- Feature proposals
- Plugin development
- Code contributions
- Testing and release validation

## Before opening a PR

Please:

1. Check existing issues and discussions.
2. Keep changes focused on a single concern when possible.
3. Read philosophy.md to understand project goals.
4. Follow existing code style and patterns.

## Pull requests

Before submitting:

- Ensure CI passes.
- Add or update tests when appropriate.
- Update documentation for user-facing changes.
- Avoid unrelated refactors.

## Working in the codebase

The technical side of development (environment setup, build commands, testing, database workflows, and release processes) lives in [DEVELOPMENT.md](./DEVELOPMENT.md).

Start there once you've chosen an issue to work on.

### Package manager

Esiana uses **pnpm only**. Enable it via Corepack (`corepack enable`) — the required version is pinned in root `package.json` (`packageManager`).

- Run `pnpm install` at the repo root — never `npm install`
- Commit `pnpm-lock.yaml` when dependencies change; do not commit `package-lock.json`
- CI rejects pull requests that introduce `package-lock.json`

See [DEVELOPMENT.md](./DEVELOPMENT.md) for install, build, and test commands.

### Tech stack

Esiana is a TypeScript monorepo:

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: Prisma (PostgreSQL and SQLite)

### Area-specific guidance

- Backend development: [backend/DEVELOPMENT.md](./backend/DEVELOPMENT.md)
- Frontend development: [frontend/DEVELOPMENT.md](./frontend/DEVELOPMENT.md)
- Plugin development: [../docs/plugin-development/getting-started.md](../docs/plugin-development/getting-started.md)

## Additional resources

- Governance: [GOVERNANCE.md](./GOVERNANCE.md)
- Security reporting: [SECURITY.md](./SECURITY.md)
- Maintainer releases: [DEVELOPMENT.md](./DEVELOPMENT.md#maintainer-release) · [GitHub Releases](https://github.com/Esiana-ttrpg/esiana-core/releases)
- Installation and local development: [../docs/options/installation.md](../docs/options/installation.md)
- Plugin development: [../docs/plugin-development/getting-started.md](../docs/plugin-development/getting-started.md)
