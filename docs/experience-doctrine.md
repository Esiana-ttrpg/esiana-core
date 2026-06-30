# Experience doctrine

Compact decision rules for Esiana UI — the layer above [design-philosophy.md](../design-philosophy.md) (identity essay), [density-doctrine.md](./density-doctrine.md) (limits), and [design-tokens.md](./design-tokens.md) (implementation).

**Use this doc when:** proposing a new route, reviewing a UI PR, or answering *"what should my eye land on first?"*

Related: [experience-doctrine-gap-map.md](./experience-doctrine-gap-map.md), [audits/experience-scorecard.md](./audits/experience-scorecard.md), [audits/experience-convergence-backlog.md](./audits/experience-convergence-backlog.md), [design-philosophy-checklist.md](./design-philosophy-checklist.md).

---

## What Esiana is

Esiana is **campaign-state-first** narrative infrastructure. Users navigate a living chronicle — lore, maps, timelines, relationships, and session memory — not a productivity dashboard.

> **Campaign state is primary. Narrative is the preferred way to understand campaign state.**

| Product | Archetype | Esiana? |
|---------|-----------|---------|
| Notion | Document-first | No — documents are one lens on state |
| Obsidian | Document + graph | Close — graph is state |
| Linear | Task-first | No — threads support state, not identity |
| Airtable | Data-first | No — raw fields are never primary |
| **Esiana** | **Campaign-state-first** | State is primary; narrative when it fits |

| Surface | State represented | Preferred representation |
|---------|-------------------|--------------------------|
| Codex / entity pages | Lore, characters, places, factions | Narrative (prose, article) |
| Maps | Spatial presence, temporal projection | Canvas |
| Timeline / chronology | When things happened | Timeline / ledger |
| Campaign Home | Current pulse, what matters now | Continuity stream |
| Relationship views | Connections between entities | Graph / link exploration |
| Session notes | What happened, what's next | Narrative (session entry) |
| Adventure | Threads, scenes, beats | Storyboard / timeline |

**Excluded from primary plane:** administrative chrome that does not represent campaign state — KPI strips, "Needs Attention" queues, overview dashboards that summarize summaries.

---

## The gravity test

**Primary gate for every screen:**

> **Where does attention settle?**

- A page with twenty cards **can work** if one gravitational center is obvious and the rest orbit it.
- A page with no cards **can fail** if every region has equal weight, borders, titles, and controls.

**Squint test (2 seconds):** Blur the page. Where does your eye stop? Name that region without reading labels.

If you cannot name the one campaign-state object the page is about, gravity cannot form.

---

## Fifteen principles

Each principle: **statement → test → common violation**.

### 1. Campaign state is primary

**Test:** Name the state object (character truth, org pressures, map at era, continuity pulse).

**Violation:** Page is a wall of admin summaries with no declared state.

### 2. Every page has one gravitational center

**Test:** Squint test — one obvious landing point.

**Violation:** Hero, rail, tabs, and card grid all claim primary status.

### 3. Narrative is the preferred representation — when it fits

**Test:** Is prose the natural fit? If state is spatial/temporal/relational, use canvas/timeline/graph instead.

**Violation:** Forcing prose wrapper around inherently visual state.

### 4. Every page declares one primary state object and its representation

**Test:** Can the route declare `state object` + `representation type` in a design review?

**Violation:** Mixed overview + content + analytics with no declared anchor.

### 5. Secondary regions orbit; they do not compete at equal weight

**Test:** Is there visible weight differential (scale, tone, isolation) between center and periphery?

**Violation:** Six equal overview cards across the top.

### 6. Administrative chrome never shares the gravity plane with campaign state

**Test:** Do status strips, customize chrome, or metrics sit at recessed weight?

**Violation:** KPI row above narrative at full prominence.

### 7. Typography creates gravity through role separation

**Test:** Exactly one display anchor; prose for state; meta recessed. See [Typographic roles](#typographic-roles).

**Violation:** Three `text-2xl font-bold` section headers; micro-labels at display volume.

### 8. Metadata supports state at meta tier; it never uses display scale

**Test:** Field labels and timestamps use `TYPE_META` or equivalent — not uppercase section banners.

**Violation:** `text-[10px] uppercase tracking-wider` on every editor section.

### 9. Actions live in declared zones

**Test:** See [Action placement](#action-placement). One primary page action per route type.

**Violation:** Edit buttons in headers, cards, rails, and banners at equal prominence.

### 10. Reading mode hides operational chrome

**Test:** Reading surfaces show navigation only — no persistent edit toolbar.

**Violation:** Icon-only toolbars on codex read mode (mobile).

### 11. Progressive disclosure beats simultaneous exposure

**Test:** Secondary metadata collapsed or on demand?

**Violation:** Every system visible at once on entity overview.

### 12. One summary beats four at equal prominence

**Test:** At most one summary region visible by default.

**Violation:** Overview + highlights + activity + insights on one plane.

### 13. Persistent rails are never the gravitational center in Reading mode

**Test:** Rail supports inspect-only; focal column owns gravity.

**Violation:** Right rail same width and contrast as main content.

### 14. Visual tempo serves gravity — dense center, sparse periphery

**Test:** Void band or silence zone between major sections?

**Violation:** Uniform medium padding top to bottom.

### 15. Continuity awareness sits at or near the gravitational center

**Test:** Does the route answer *what changed, what matters now, what connects to before?*

**Violation:** Generic CRUD with no temporal context. See [Signature interaction](#signature-interaction).

---

## Typographic roles

Typography is the **primary mechanism for information gravity**. Role separation modulates attention; palette typography (tracking, warmth in `typographySignature.ts`) modulates atmosphere only.

| Role | Class | Font | Gravity function |
|------|-------|------|------------------|
| **Display** | `TYPE_DISPLAY_CLASS` / `.type-display` | Source Serif 4 | Gravitational anchor — page title, entity name |
| **Prose** | `TYPE_PROSE_CLASS` / `.type-prose` | Source Serif 4 | Primary state reading — lore body, continuity stream |
| **Meta** | `TYPE_META_CLASS` / `.type-meta` | System UI sans | Recessed orbit — timestamps, breadcrumbs, rail labels |
| **Section label** | `META_SECTION_LABEL_CLASS` | System UI sans | Sentence-case region title — dashboard cards, editor sections, zone headings |
| **Field label** | `META_FIELD_LABEL_CLASS` | System UI sans | Sentence-case form label — settings fields, metadata keys |
| **Table head** | `META_TABLE_HEAD_CLASS` | System UI sans | Sentence-case column header — admin tables, member lists |

**Shared components:** `CodexSectionLabel` / `CodexFieldLabel` in `codexMetadataEditorShared.tsx`; `FieldLabel` in `settingsFormHelpers.tsx` and `AdminSectionCard.tsx` — all route through the helpers above.

**Implementation:** `frontend/src/lib/surfaceLayout.ts`, `frontend/src/index.css`, `frontend/src/lib/theme/typographySignature.ts`.

**Typography tests:**

1. **Anchor:** Exactly one display-scale element per viewport?
2. **Tier:** Meta quieter than prose (smaller, sans, muted ink)?
3. **Measure:** Prose at editorial measure (`--text-measure-ch`, Standard 68ch / Wide 80ch per [density-doctrine.md](./density-doctrine.md))?
4. **Squint:** One large type mass vs smaller supporting type — without reading words?

**Converged examples:** `CampaignDashboardHero`, `CampaignContinuityStream`, `CategoryHubShell`, `InterpretiveLoreHeader`.

**Adoption gap (post-cleanup 2026-06):** P0 routes and metadata editors use `TYPE_*` / `META_*` helpers. Remaining `uppercase` usage is intentional — compact **categorical identification tokens** (see below). Do not add parallel display dialects (`text-4xl font-bold` bypassing `TYPE_DISPLAY`).

**Categorical identification tokens (exempt from uppercase ban):**

Compact pills/chips whose **primary purpose is identification**, not hierarchy — visibility/revelation, rarity/threat, status/lifecycle, moderation/access. These may keep `uppercase`, tight tracking, and pill styling.

**Test:** Would removing uppercase make this harder to scan as a category without helping the user find the page's gravitational center? If yes → exempt. If it functions as a **section title** or **field label** → use `META_*` helpers and sentence-case copy.

**Not exempt:** zone headings, sidebar sections, table column headers, metadata editor section titles, overview dashboard card titles, page/entity titles (use `TYPE_DISPLAY_CLASS`).

**Rules:**

- Never apply `uppercase` + `tracking-wider` to section/zone/field labels — use `META_SECTION_LABEL_CLASS` or `META_FIELD_LABEL_CLASS` with sentence-case copy.
- Hero titles route through `TYPE_DISPLAY` or `--type-display-size` — not hardcoded Tailwind scale.
- Metadata editor section titles are meta tier, not display tier.

---

## Gravity levers

| Lever | Mechanism |
|-------|-----------|
| Semantic anchor | Page is *about* one state object |
| Scale | Display type, measure, portrait, map canvas |
| Typographic role | Display / Prose / Meta separation |
| Tonal lift | `region-depth-*`, `SURFACE_*_CLASS` per [surface-hierarchy.md](./surface-hierarchy.md) |
| Isolation | Void bands (`canvas-recess`), margin, silence |
| Accent discipline | At most one illuminated element per region |
| Tempo | Dense center, sparse periphery |

**Equal visual weight is the anti-pattern** — not cards. Cards are fine when one stream or card clearly dominates.

---

## Representation types

Match layout to campaign state — not a ban on cards.

| Type | State shown | Gravity anchor |
|------|-------------|----------------|
| Editorial stream | Lore, session notes, entity narrative | Prose column / lede |
| Canvas | Maps, storyboard | Spatial center |
| Timeline / ledger | Chronology, threads, beats | Temporal spine |
| Continuity stream | What changed, what matters now | Pulse line (signature) |
| Graph / link view | Relationships | Selected node or path |
| Table / index | Catalog, entity lists | Selection or sort focal row |
| Contextual rail | Inspect metadata | Never gravity center in Reading mode |
| Card cluster | Optional widgets | Valid only when one element dominates |

---

## Action placement

| Zone | Location | Examples |
|------|----------|----------|
| **Global** | App chrome, top-right | Account, notifications, campaign switcher |
| **Page** | Page header / toolbar — **Writing mode only** | Edit, publish, visibility scope |
| **Object** | Inline on the acted-upon object | Block handles, row actions, map pin |
| **Contextual** | Rail or sheet, on demand | Inspector, provenance, metadata drawer |

**Per route type:**

| Route | Primary action zone | Primary action |
|-------|---------------------|----------------|
| Codex article (Reading) | None persistent | — |
| Codex article (Writing) | Page toolbar | Save / publish |
| Entity page (Reading) | Object (hero strip) | Jump to tab from overview card |
| Entity page (Writing) | Page + object | Edit field from overview |
| Campaign Home (briefing) | Object (continuity row) | Open changed lore |
| Campaign Home (customize) | Page (operational) | Add widget / save layout |
| Map | Object | Place pin, select object |
| Chronology | Page (view switcher) | Create event (GM) |
| Session notes index | Page | New session note |
| Session note editor | Page (Writing) | Save |
| Adventure / storyboard | Object + canvas | Edit node, connect beat |
| Global Hub | Global + object | Open campaign, create campaign |

**Rule:** Reading mode — zero persistent operational chrome except navigation.

**Deferred:** Command palette / slash commands — not in core doctrine; plugins may extend.

---

## Signature interaction

**Continuity stream** — *"I see what changed since last session."*

Every major route should answer: **what changed, what matters now, what connects to what came before?**

| Capability | Relationship to signature |
|------------|-------------------------|
| Continuity stream | **Primary** — Campaign Home pulse, since-last-visit, recent lore |
| Knowledge reveal | Supports continuity — *what the party now knows* |
| Temporal navigation | Supports continuity — *then vs now* on maps/chronology |

Continuity should sit **at or near the gravitational center**, not in a recessed widget row competing with overview cards.

**Converged:** `CampaignContinuityStream`, `CampaignStateCard`, `CampaignRecentActivity` (when subordinate to pulse).

**Weak:** Entity overview dashboards with no since-last-visit or change signal at focal weight.

---

## How to use this doc

### UI PR gate

1. **Gravity test:** Where does attention settle?
2. **State object:** What campaign state does this page show?
3. **Principles:** List any of the 15 touched; justify violations.
4. **Deprecated + IA patterns:** Check [deprecated-ui-patterns.md](./deprecated-ui-patterns.md) (#1–#20).

### New route design review (before implementation)

Declare in PR or issue:

- Primary **campaign-state object**
- **Representation type** (editorial, canvas, timeline, stream, …)
- **Gravitational center** (component or region name)
- **Continuity hook** (how route answers what changed)

### Quarterly review

Re-run [experience-scorecard.md](./audits/experience-scorecard.md) on the seven canonical routes. Target: **≥4** on gravity test average.

---

## Appendix — mechanics docs

| Doc | Role |
|-----|------|
| [design-philosophy.md](../design-philosophy.md) | Identity, tone, anti-goals (essay) |
| [density-doctrine.md](./density-doctrine.md) | Panel limits, measure, widget caps |
| [surface-hierarchy.md](./surface-hierarchy.md) | Surface role tokens (implements gravity) |
| [design-tokens.md](./design-tokens.md) | CSS variables, ThemeStack |
| [deprecated-ui-patterns.md](./deprecated-ui-patterns.md) | Pattern blocklist #1–#20 |
| [terminology.md](./terminology.md) | User-facing copy |
| [experience-doctrine-gap-map.md](./experience-doctrine-gap-map.md) | Doc redundancy map |
