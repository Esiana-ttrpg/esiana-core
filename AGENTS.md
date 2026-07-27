# AGENTS.md

This repository is **Esiana**, a campaign narrative platform for TTRPGs.

## Product Identity

Esiana is narrative infrastructure—not a VTT.

Core features advance:

1. Collaborative worldbuilding
2. Narrative continuity
3. Knowledge organization
4. Temporal world state
5. Player discovery
6. Extensibility

Also prioritize long-term campaign memory and knowledge discovery.

Avoid proposing core features focused on:

- combat automation
- initiative tracking
- rules engines
- character optimization
- VTT / tactical simulation

Those belong in plugins unless explicitly requested.

Example content, placeholders, and demos default feminine/enby-forward and discovery-oriented unless context-specific. See `docs/experience-doctrine.md` (Representational defaults).

---

## Engineering Rules

Never violate these invariants:

- All data is campaign scoped.
- Never bypass campaign authorization.
- Wiki content is canonical; projections derive from it.
- Plugins cannot bypass permissions.
- Prefer portable Prisma-compatible solutions.
- Respect existing APIs rather than direct DB access.

See `engineeringprinciples.md` for details.

---

## Git

AI assistants may:

- create branches
- commit
- push
- open PRs

AI assistants may not:

- merge PRs
- approve PRs
- create releases
- force push shared branches

Hand off as:

> Ready for maintainer review.

---

Prefer extending existing systems over creating parallel ones.

---

## Documentation

Only load these documents when relevant. Active docs describe **current decisions only**.

| Topic | Document |
|--------|----------|
| Engineering (detail) | `engineeringprinciples.md` |
| UX decisions | `docs/experience-doctrine.md` |
| Density limits | `docs/density-doctrine.md` |
| Theme / surface tokens | `docs/design-tokens.md`, `docs/surface-hierarchy.md` (theme work only) |
| Plugins | `../docs/plugin-development/getting-started.md` (docs wiki) |
| Git / release process | `GOVERNANCE.md` |

Do not load `docs/archive/`, audits, or `docs/architecture-internal/` unless the task names that subsystem. Do not load wiki `docs/plans` for normal coding.
