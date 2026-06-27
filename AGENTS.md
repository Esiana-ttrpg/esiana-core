# AGENTS.md

Policy for humans and AI assistants working in this repository. Esiana separates **intent** (this document) from **mechanics** (GitHub rulesets — see §6).

---

## 1. Identity

Esiana is **campaign narrative infrastructure**, not a virtual tabletop. The product exists to preserve continuity, historical state, collaborative worldbuilding, knowledge revelation, and long-term campaign memory across interconnected lore.

**Priorities (in order):** narrative continuity over combat tooling; knowledge organization over rules execution; temporal world state over static wiki pages; player discovery over omniscient data exposure.

**We are not building:** tactical combat simulators, Foundry replacements, rules automation engines, character optimization platforms, live-service MMO campaign hosts, or initiative/line-of-sight/combat automation. Maps are world-history views (temporal projection, lore pins), not battle simulators. Push back on features that primarily automate combat or replace a VTT — scope them as optional plugins only.

**UX tone:** calm, restrained, lore-forward. Avoid startup-dashboard chaos and over-decorated fantasy chrome. User-facing copy uses **Campaign Home** (not Dashboard), **Game Master** / **Writer** (not Steward). Before adding a feature, ask whether it strengthens continuity, discovery, or temporal world state.

Canonical product direction: [philosophy.md](./philosophy.md), [design-philosophy.md](./design-philosophy.md).

---

## 2. Authority

Humans own merges, releases, tags, and canon-shaping product decisions. Maintainers review pull requests and are the final gate.

AI assistants **propose only**. They may open branches, commit and push when explicitly directed, create pull requests, and iterate on review feedback. They do not approve pull requests, merge to shared branches, declare work shipped, or publish releases.

---

## 3. Engineering invariants

Every change must respect these semantic expectations. Details: [engineeringprinciples.md](./engineeringprinciples.md).

**Tenant isolation.** Campaigns are isolated tenants. No cross-campaign leakage in queries, caches, search, plugin data, or exports. Campaign-scoped routes use scope middleware, membership checks, and `campaignId` in reads and writes.

```typescript
// Scoped mutation
const page = await prisma.wikiPage.findFirst({ where: { id, campaignId } });
if (!page) return res.status(404).end();

// Never: id-only update (cross-tenant risk)
await prisma.wikiPage.update({ where: { id } }, data);
```

**Temporal system integrity.** Wiki / TipTap content is canonical; graphs, maps, diplomacy views, and storyboards are derived projections on wiki metadata. One map presence resolver (`resolveMapObjectPresence`) — layers affect visibility; groups and client filters are editor-only. Temporal maps use visibility windows and keyframe overrides on one base asset, not duplicate uploads per era.

**Plugin safety.** Plugins are capability-constrained integrations, not unrestricted code execution. Core remains authoritative over permissions, provenance, temporal integrity, and tenant boundaries.

**Portability and sovereignty.** Migrations and queries stay engine-agnostic via Prisma. Prefer exportable formats (Markdown + frontmatter, portable ZIP backups). New core behavior exposes stable APIs; the frontend uses APIs rather than privileged direct database access.

**Locked decisions** — do not re-litigate without explicit maintainer direction:

| Area | Decision |
|------|----------|
| Real-time | Polling + focus refresh; no WebSockets/SSE for notifications |
| Mail | Hardcoded nodemailer SMTP via Admin settings |
| Events | Extend controller hooks; no full central `dispatchDomainEvent` refactor |
| Security | Targeted rate limits only; no global `/api/*` limiter |
| Recruitment | No leaderboards, ratings, or engagement-optimization metrics |
| Chronology | No `TimelineEra` model resurrection |
| Versioning | Product version in `package.json`, not `SystemSetting` DB |
| Imports | OneNote / Google Docs ingestion — plugin-only |
| Share links | No tokenized public read-only wiki surfaces in core |
| Fog | Visibility state on entities; no separate `FogEngine` product |

Full ledger: [docs/deferred-backlog.md](./docs/deferred-backlog.md).

---

## 4. Domain behavior guidance

### Frontend

Use campaign APIs and existing hooks; respect server-stripped fields. **Campaign Home** (`/campaigns/:handle/dashboard`) holds modular, role-aware widgets — extend `GET .../dashboard` when adding widget data. The **sidebar** is navigation only; do not move recency, pulse, or heavy analytics there.

Maps: client filters run after scene load; never pass `groupIds` to scene fetch as visibility inputs. Codex uses **Reading | Writing** mode and **Standard | Wide** layout (measure only — not more columns). Default campaign entry is codex/wiki; Campaign Home is a secondary overview.

New UI must follow [docs/density-doctrine.md](./docs/density-doctrine.md), [docs/deprecated-ui-patterns.md](./docs/deprecated-ui-patterns.md), and [docs/terminology.md](./docs/terminology.md). Match surrounding patterns before introducing new abstractions.

### Backend

Primary scoped surface: `/api/campaigns/:handle/*`. Mutations: `findFirst({ id, campaignId })` then `update({ where: { id } })`. Domain events use DTOs only — extend direct controller hooks rather than centralizing all emitters. Uploads are ACL-backed; no static public upload directories.

Map scene APIs for party views: omit hidden objects entirely; clamp `viewEpochMinute` to campaign time; strip link targets when the wiki page is not viewable. New models stay Prisma-portable; consider export/backup impact.

### Plugins

Manifest v2: declare `permissions[]`, `engines.esiana-core` version range, and `configSchema`. Register via `PluginHostContext`; campaign-scoped data through `createPluginDataService` when permitted. Data interceptors run in a worker sandbox with allowlists and quarantine on failure. UI slots and `wiki:decorate` are read-only metadata injection — do not bypass core ACL. Foundry sync and similar packages are stubs/adapters, not core VTT features.

Author docs: [docs/plugin-development/getting-started.md](../docs/plugin-development/getting-started.md).

---

## 5. Git workflow contract

**AI can propose, never merge.**

**May (when directed):** create feature branches; stage, commit, and push; open pull requests with summary and test plan; push fixes in response to review.

**Must not:** `gh pr merge`; `gh pr review --approve`; enable auto-merge; merge or rebase into `develop` or `main` on shared branches; force-push shared branches; create release tags; run maintainer release publish.

Hand off with: *Ready for maintainer review and merge.*

Mechanical enforcement (PR required, approvals, CI, no force-push) lives in [.github/rulesets/develop-main.json](./.github/rulesets/develop-main.json) — activated by a maintainer after merge (see [GOVERNANCE.md](./GOVERNANCE.md)).

---

## 6. Cross-references

| Resource | Purpose |
|----------|---------|
| [GOVERNANCE.md](./GOVERNANCE.md) | Branch model, maintainer authority, ruleset import |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | PR hygiene, CI, tests |
| [.github/rulesets/develop-main.json](./.github/rulesets/develop-main.json) | Machine-enforceable git workflow |
| [philosophy.md](./philosophy.md) | Product identity |
| [engineeringprinciples.md](./engineeringprinciples.md) | Engineering guardrails |
| [docs/experience-doctrine.md](./docs/experience-doctrine.md) | UI decision rules — gravity test, principles, action placement |
| [docs/audits/experience-scorecard.md](./docs/audits/experience-scorecard.md) | Route-level UX baseline scores |
| [docs/plans/](./docs/plans/) | Plan snapshots |
| [GitHub Issues](https://github.com/Esiana-ttrpg/esiana-core/issues) / [Milestones](https://github.com/Esiana-ttrpg/esiana-core/milestones) | Open work |

**Planning hygiene:** v1.0.1 shipped. Post-1.0 work extends views and plugins over a frozen schema. Check issues, milestones, and deferred-backlog before roadmap implementation. Layer 6 narrative intelligence (session prep, pacing analytics) is not shipped. Map atlas polish (clustering, cached manifests) remains open — core atlas shipped.

**Shipped pre-1.0 foundation:** cross-system fog/revelation (L1–4), OpenAPI at `/api/docs`. Audits: [docs/audits/pre-1.0-export-audit.md](./docs/audits/pre-1.0-export-audit.md), [docs/audits/migration-audit.md](./docs/audits/migration-audit.md).
