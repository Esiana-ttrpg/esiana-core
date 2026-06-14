# Esiana Core Development Roadmap

Engineering targets for a **narrative operating system for long-form TTRPG campaigns** — continuity, memory, revelation, and orchestration over static wiki pages.

User-facing capability summaries stay in [README.md](./README.md#features). **Shipped** product changes are recorded in [changelog.md](./changelog.md), grouped by domain. Deferred and won't-do items from plans live in [docs/deferred-backlog.md](./docs/deferred-backlog.md).

**Product status:** **v1.0.0** shipped — schema freeze + production baseline complete  
**Last reviewed:** 2026-06-13

### Pre-1.0 design convergence

Visual identity, density doctrine, terminology, and shell primitives are **pre-1.0 gates** — not post-freeze polish. Tier A (governance + shared primitives) before broad surface sweeps. See [design-philosophy.md](./design-philosophy.md), [docs/density-doctrine.md](./docs/density-doctrine.md), [docs/terminology.md](./docs/terminology.md).

### How to use this file

| Marker | Meaning |
|--------|---------|
| `[ ]` | Open — scheduled here |
| Shipped | [changelog.md](./changelog.md) only |
| Won't do | [docs/deferred-backlog.md](./docs/deferred-backlog.md) only |

**Metadata tags** (after each item title):

| Tag | Meaning |
|-----|---------|
| `layer:1` … `layer:6` | Narrative Platform engine dependency tier (see [narrative-engine-layers.md](./docs/plans/narrative-engine-layers.md)) |
| `depends:layer-N` | Hard prerequisite — do not schedule above layer N until substrate exists |
| `gate:pre-1.0` | Blocks v1.0.0 tag until complete |
| `schema-sensitive` | Needs migration before schema freeze |
| `ui-only` | UI/orchestration; no core table churn |
| `post-freeze-safe` | Views, generators, or metadata over existing tables |
| `target:v0.8` / `target:v0.9` | Historical release-candidate tags (not schema gates) |
| `target:pre-1.0` | Pre-1.0 polish or portability (not a schema gate) |
| `convergence:pre-1.0` | Design philosophy alignment (see design-philosophy.md) |
| `legacy: Phase N` | Former numbered phase (searchability only) |

### Doc index

- [changelog.md](./changelog.md) — release notes by product domain and version
- [docs/deferred-backlog.md](./docs/deferred-backlog.md) — deferred / out-of-scope items from plans
- [docs/plans/narrative-engine-layers.md](./docs/plans/narrative-engine-layers.md) — engine layer definitions and dependency order
- [docs/plans/downtime-havens-ledger.md](./docs/plans/downtime-havens-ledger.md) — downtime simulation layer
- [docs/plans/authoring-workflow.md](./docs/plans/authoring-workflow.md) — contextual authoring overlays
- [docs/plans/canonical-page-editor.md](./docs/plans/canonical-page-editor.md) — canonical page editor plan
- [docs/plans/](./docs/plans/) — in-repo plan snapshots
- [philosophy.md](./philosophy.md) — product identity and anti-goals
- [design-philosophy.md](./design-philosophy.md) — experience, density, layout identity
- [docs/terminology.md](./docs/terminology.md) — user-facing vs engineering terms
- [docs/density-doctrine.md](./docs/density-doctrine.md) — hard UI density constraints
- [docs/surface-hierarchy.md](./docs/surface-hierarchy.md) — primary / contextual / recessed / operational roles
- [../docs/README.md](../docs/README.md) — documentation wiki (features, options, import guide)
- [../docs/features/](../docs/features/) — user-facing feature guides (GM / player)
- [../docs/options/](../docs/options/) — operator config (env vars, admin, deployment)

## At a glance

- **North star:** Esiana models **canonical narrative time** (campaign-scoped in-world runtime) — not productivity scheduling. Chronology is substrate, not a utility feature.
- **Engine order:** L1 Canon → L2 State → L3 Living World → L4 Diagnostics → L5 Workspace → L6 Intelligence. See [philosophy.md](./philosophy.md).
- **Layers 1–4 narrative foundation:** Complete — temporal runtime, narrative state engine, living world, diagnostics batch. See [changelog.md](./changelog.md).
- **Pre-1.0 gate (open):** Schema freeze checklist + extension-points doc + infra baseline (Postgres, Docker, CI) below.
- **Downtime:** Phases 1–8 core shipped — see [changelog.md](./changelog.md) and [downtime-havens-ledger.md](./docs/plans/downtime-havens-ledger.md).

---

## Release gates

### Pre-1.0 schema freeze (blocks v1.0.0)

Layer 1 convergence and continuity warnings v1 are complete — see [changelog.md](./changelog.md).

- [x] Migration audit: no pending destructive migrations queued for post-1.0 — see [migration-audit.md](./docs/audits/migration-audit.md) (audited 2026-06-13)
- [x] Extension points documented for post-1.0 work (metadata JSON, revelation, temporal projection, plugins) — lore: [lore-knowledge-extension-points.md](./docs/architecture-internal/lore-knowledge-extension-points.md); plugins: [capability-matrix.md](./docs/plugins/capability-matrix.md), [pre-1.0-plugin-platform.md](./docs/plans/pre-1.0-plugin-platform.md) (audited 2026-06-13)

### v1.0.0 production baseline

*Prefer delaying 1.0 over large post-freeze migrations.*

- [x] Pre-1.0 schema freeze checklist complete — migration audit + export audit + [database-portability-audit.md](./docs/audits/database-portability-audit.md) done; baseline squash at v1.0.0 ([migration-audit.md](./docs/audits/migration-audit.md))
- [x] **Platform & infrastructure** items below (portability audit, Postgres CI parity, Postgres default, Docker, CI) complete

### Post-1.0 schema policy

| Allowed after freeze | Avoid after freeze |
|----------------------|-------------------|
| New UI views, dashboards, generators over existing tables | New core entity tables |
| Plugin data in plugin namespaces | Breaking renames without a major version |
| JSON/metadata on existing models | Large normalization splits |
| Rare documented index/performance migrations | “While we're here” schema churn |

If a feature needs a **large migration**, ship it in the Pre-1.0 window or defer to a future **2.0**-style breaking release — not a 1.1 drive-by.

---

## Narrative Platform (open work)

> Engine layers: [narrative-engine-layers.md](./docs/plans/narrative-engine-layers.md). Shipped layers 1–5 and downtime Phases 1–8: [changelog.md](./changelog.md). Won't-do scope: [deferred-backlog.md](./docs/deferred-backlog.md).

### Layer 5 — Narrative Workspace (open)

*Storyboard, investigation, timelines, relations shipped — [changelog.md](./changelog.md).*

#### Projection chrome

- [ ] **Hierarchical quest outliner** — Tree-style quest planning with branches and conditional progression — `layer:5` `ui-only` `post-freeze-safe` `depends:layer-2` `legacy: Phase 15.5`

### Layer 6 — Narrative Intelligence

*Generators and analytics · `post-freeze-safe` · `depends:layer-4` `depends:layer-5`*

#### Prep generation

- [ ] **Session prep generator** — Recent lore edits, relevant NPCs, open threads, regional deltas, rumors, last-appearance summaries — `layer:6` `post-freeze-safe` `depends:layer-2` `depends:layer-3` `legacy: Phase 21`

#### Pacing analytics

- [ ] **Narrative pacing diagnostics** — Balance across combat, social, exploration, mystery, horror, downtime — `layer:6` `post-freeze-safe` `depends:layer-4` `depends:layer-5` `legacy: Phase 15.5`
- [ ] **Campaign pacing analytics** — Inactive plotlines, forgotten NPCs, unvisited regions, faction dominance, lore density — `layer:6` `post-freeze-safe` `depends:layer-2` `depends:layer-3` `legacy: Phase 21`

#### Recap synthesis

- [ ] **“Previously on…” summaries** — Player-safe / GM / faction / character views from journals, events, provenance — `layer:6` `post-freeze-safe` `depends:layer-2` `legacy: Phase 21`
- [ ] **Session recap drafting tools** — GM-facing recap drafts from tagged scenes, events, objectives — `layer:6` `post-freeze-safe` `depends:layer-5` `legacy: Phase 21`
- [ ] **Automatic campaign journal generation** — Chronological entries from scenes, quests, edits, linked entities — `layer:6` `post-freeze-safe` `depends:layer-5` `legacy: Phase 15.5`
- [ ] **Session activity summaries** — New scenes, NPCs, locations, factions, narrative changes — `layer:6` `post-freeze-safe` `depends:layer-5`
- [ ] **Narrative change history** — How arcs, relationships, and world states evolved — `layer:6` `post-freeze-safe` `depends:layer-1` `depends:layer-2`
- [ ] **Combined Notes integration** — Journals integrate with note aggregation and filtered workspace views — `layer:6` `post-freeze-safe` `depends:layer-5`
- [ ] **Creative session retrospectives** — Writing sessions, structural changes, campaign growth — `layer:6` `ui-only` `post-freeze-safe` `depends:layer-5`

#### Spotlight analysis

- [ ] **Session spotlight analysis** — Faction usage, NPC presence, location reuse, character focus — `layer:6` `post-freeze-safe` `depends:layer-4` `depends:layer-5` `legacy: Phase 15.5`

### Adjacent (maps/codex watchpoints — not a layer)

*General performance / UX watchpoints — not release gates*

- Ancestor reveal — Filter → Ancestor augmentation → Forest; wire `includeAncestorIds` when search matches deep nodes
- Parent→children index — profile before optimizing forest `.filter()` loops

---

## Campaign & table operations

### Session notes polish

- [ ] **Per-author references context (optional)** — Filter `ReferencesWidget` to selected roster member's `pageId` in `SessionNoteEditor` — `ui-only`

### Workflow optimization (v1.1+)

- [ ] **Entity & folder icon customization** — Lucide or mini uploads on tree nodes — `ui-only` `legacy: Phase 15`
- [ ] **Quick Access sidebar (DM/Co-DM)** — Campaign-wide shortcut list in sidebar; DM/Co-DM manage, members read filtered by page visibility — `ui-only` `schema-sensitive`
- [ ] **CampaignQuickAccess data model** — Prisma model + migration; campaign-scoped wiki page shortcuts distinct from personal `PageShortcut` — `schema-sensitive`
- [ ] **Quick Access API** — `GET/POST/DELETE/PATCH /wiki/quick-access` CRUD for campaign shortcuts — `depends:CampaignQuickAccess`
- [ ] **Multi-calendar temporal mapping** — Concurrent calendars with unified baseline translation — `layer:1` `schema-sensitive` `depends:layer-1` `legacy: Phase 15`
- [ ] **Campaign-scoped theme engine** — DM CSS, fonts, palette overrides — `ui-only` `legacy: Phase 15`
- [ ] **CSV/JSON structured table ingestion** — Parse pasted rows and spreadsheet files into markdown tables — `ui-only` `legacy: Phase 15`
- [ ] **Interactive rollable tables** — Dice-roll trigger on structured tables (e.g. 1d100) — `ui-only` `legacy: Phase 15`
- [ ] **Chronology-appended wiki workflows** — Automated temporal timestamp badges on new wiki saves — `layer:1` `ui-only` `depends:layer-1` `legacy: Phase 15`
- [ ] **Admin UI catalog runtime overrides** — Instance-level game systems and custom themes — `ui-only` `legacy: Phase 15`
- [ ] **Sidebar layout polish** — Optional tabbed sidebar (PLAY/WORLD/TIMELINE/TOOLS zone IA shipped — [sidebar-ia-reorder.md](./docs/plans/sidebar-ia-reorder.md)) — `ui-only` `legacy: Phase 15`
- [ ] **Campaign reference HUD** — Split wiki search + session scratchpad for second monitor — `ui-only` `legacy: Phase 16`
- [ ] **Ambient calendar clicker** — +1 hour/day with fantasy date stamps on scratchpad — `ui-only` `legacy: Phase 16`
- [ ] **Incremental backup & sync sharding** — Delta exports for large worlds — `legacy: Phase 16`
- [ ] **Push notifications (mobile/PWA)** — Native or PWA push beyond in-app polling — `legacy: Phase 16`
- [ ] **Inline media asset interceptor** — Extract base64 images from blocks to static storage — `legacy: Phase 6`
---
- [-] **Optimistic concurrency controls** — Save version signatures to prevent DM/Co-DM overwrite races — `legacy: Phase 6`

## Platform & infrastructure

*Not Pre-1.0 narrative gate; capacity profiling does not block v1.0.0.*

### Core testing & scalability

- [x] **Benchmark campaign generators** — Small, Medium, Large, and Extreme Archive datasets for profiling, CI, demos, and plugin development — `legacy: Phase 6`
- [x] **Capacity profiling and deployment guidance** — Benchmark common campaign sizes; publish recommended hardware specs and upgrade signals — `legacy: Phase 6`



### v1.0.0 production baseline

- [x] **Database portability audit** — Dual-engine confidence before default flip — `gate:pre-1.0` `legacy: Phase 11` — [database-portability-audit.md](./docs/audits/database-portability-audit.md)
  - [x] Raw SQL review — inventory `$queryRaw` / `$executeRaw` / migration SQL; fix or document engine-specific scripts
  - [x] Ordering review — deterministic `orderBy` on user-visible lists (NULL/tie-break parity)
  - [x] Case sensitivity review — `contains` / `startsWith` / `endsWith` / `mode: 'insensitive'` and custom search logic
  - [x] Export/import matrix passes on both engines — A-tier rows; see [pre-1.0-export-audit.md](./docs/audits/pre-1.0-export-audit.md)
- [x] **Postgres CI parity** — Full backend test suite on Postgres (not migrate-only) — `gate:pre-1.0` `legacy: Phase 11`
- [x] **Postgres default deployment** — Flip repo/Docker/dev defaults after CI stable — `gate:pre-1.0` `legacy: Phase 11`
- [x] **Multi-stage Docker architecture** — Compose + Dockerfiles in repo; polish multi-stage caching — `legacy: Phase 11`
- [x] **Orchestration & resilient initialization** — Health checks in compose; entrypoint runs migrate — `legacy: Phase 11`
- [X] **Prisma transaction audit** — Database-agnostic repository handling — `legacy: Phase 11`
- [X] **Branch protections** — Required PR reviews on `main` / `develop` — `legacy: Phase 12`
- [X] **CodeQL SAST** — GitHub Actions CodeQL on pull requests — `legacy: Phase 12`
- [ ] **Automated dependency auditing** — Dependabot, Snyk, or similar — `legacy: Phase 12`
- [X] **Secret exposure safeguards** — Repository secret scanning — `legacy: Phase 12`

### v1.0.x operations & docs (parallel; does not block v1.0.0 tag)

> Docs split scaffolding shipped — see [changelog.md](./changelog.md) Unreleased; expansion tracked below.

- [ ] **Production README overhaul** — Flagship capabilities with screenshots — `legacy: Phase 13`
- [ ] **Core architectural whitepaper** — Layout-block engine, entity fallbacks, tenant isolation — `legacy: Phase 13`
- [ ] **OpenAPI / API docs split** — Version-locked `openapi/openapi.yaml` + `/api/docs` in core; human API guides in [`docs/api/`](../../docs/api/) — expand route coverage over time — `legacy: Phase 13`
- [ ] **Plugin developer kit (PDK)** — Author docs in [`docs/plugin-development/`](../../docs/plugin-development/); hello-world in example-plugin; `@esiana/plugin-sdk` deferred — `legacy: Phase 13`
- [ ] **Self-hosting & operations manual** — [`docs/self-hosting/`](../../docs/self-hosting/) + `docker-compose.yml`; expand with screenshots — `legacy: Phase 13`
- [ ] **Contributor setup guide** — Env vars, admin bootstrap, DB provider switching — `legacy: Phase 13`

---

## Cross-campaign & ecosystem
> **Campaign ACL Phases 1–3 shipped.** See [changelog.md](./changelog.md) and [campaign-access-model.md](docs/architecture-internal/campaign-access-model.md).

- [ ] **Public campaign presentation controls (future)** — Rich anonymous/public surface toggles beyond three-tier discoverability — `ui-only` `post-freeze-safe` `depends:campaign-access-phase-3` `convergence:pre-1.0`
- [ ] **Shared universe chronology linkage** — Master calendar across parallel campaigns — `post-freeze-safe` `legacy: Phase 17`
- [ ] **Campaign lifecycle management** — Mark complete, hide LFG, read-only snapshots — `post-freeze-safe` `legacy: Phase 17`
- [ ] **Summary snapshot** — End-of-campaign stats page and export prompts — `post-freeze-safe` `legacy: Phase 17`
- [x] **Campaign capacity tier (Settings)** — Classify campaign size; link to self-hosting sizing guidance — `post-1.0` (basic tier + hint shipped in Status tab; asset-weighted tiers deferred)
- [ ] **Campaign access — UI polish** — Relabel ownership transfer vs gamemaster handoff in settings; owner/GM sections — `ui-only` `depends:campaign-access-phase-1`
- [ ] **Narrative milestone system** — Badges from session note event tags — `post-freeze-safe` `legacy: Phase 17`

---

## Explicitly out of core product

Optional integrations only — see [philosophy.md](./philosophy.md) anti-goals.

Initiative trackers, combat automation, dice engines as core focus, character sheet rules execution, animation systems, lighting/LOS, battle maps, encounter automation, spell/rule adjudication, tactical movement.
