# Density doctrine

Hard UI density constraints — enforceable via cursor rules, PR checklist, and code defaults. Without these, legacy dashboard patterns regrow.

Related: [design-philosophy.md](../design-philosophy.md), [surface-hierarchy.md](./surface-hierarchy.md), [deprecated-ui-patterns.md](./deprecated-ui-patterns.md), [design-tokens.md](./design-tokens.md).

## Hard constraints

| Rule | Reading | Writing | Campaign Home | Admin/settings |
|------|---------|---------|---------------|----------------|
| Max simultaneous primary panels | **1** focal (+ optional collapsed rail) | **2** (content + one context) | **2** (hero + widgets) | Exempt |
| Max expanded side surfaces | 1 (rail OR timeline) | 2 | 0 persistent side panels | — |
| Preferred reading measure | **68ch** Standard / **80ch** Wide | 72–80ch | N/A | — |
| Max prose line length | `min(80ch, 100%)` Std; `min(90ch, 100%)` Wide | Same | — | — |
| Bordered card nesting | **Max 2** | Max 2 | Max 2 in widgets | Max 3 in tables |
| Sidebar width | **18rem (`w-72`)**; off-canvas below `lg` | Same | Same | Drawer same |
| Metadata without expand | **≤2 lines** | ≤4 lines | Widget subtitle ≤1 line | Exempt |
| Uppercase micro-labels | **0 new** | 0 new | 0 new | Legacy until pass |
| Campaign Home widgets | — | — | **Default ≤6** enabled; **cap 10** | — |
| Status/metrics chrome | Hidden/collapsed | Contextual chip | No persistent KPI strip | Exempt |
| Vertical scroll contexts | **1** (campaign workspace column only) | Drawer/overlay may scroll when operational | N/A | Exempt |

Constants in `frontend/src/lib/densityConstants.ts`.

## Metadata compression

- Prefer inline prose over badge rows
- Secondary facts behind expand — no badge walls
- Save/sync: single muted line
- Max **3** pills/tags per entity hero without "+N more"

## Ultrawide layout principle

**Breakpoint:** `≥1920px` (`ULTRAWIDE_BREAKPOINT_PX`).

Additional width increases breathing room, readability, contextual layering, continuity visibility, immersion — **not** operational density.

| Use extra width for | Do not use for |
|---------------------|----------------|
| Margins, gutters | Extra widget columns |
| Measure cap + centering | Third/fourth primary panels |
| One receded collapsible rail | Filling every pixel with controls |
| Collapsible continuity chips | Dashboard-wall proliferation |

### Hard rules

- **One** visually dominant content column on Reading surfaces
- Prose **never exceeds 90ch** — extra width → margin, not longer lines
- **Wide layout** = +12ch measure max + side margins — not multi-column prose
- Secondary panels: recede, collapsible, collapsed-by-default in Reading
- Campaign Home: enabled widget count capped — no auto-enable as width grows
- Writing: max 2 primary regions; third = overlay/drawer only
- **Reading/index surfaces:** no `max-h-[calc(100vh-*)]` + `overflow-y-auto` on focal content, contextual rails, or read-mode widget lists — use document flow (`readingSurfaceLayout.ts`)

See [deprecated-ui-patterns.md](./deprecated-ui-patterns.md) #12–#14.

## Content priority collapse

Responsive narrative surfaces **degrade semantically** — not via horizontal scroll.

| Priority | Collapses first on narrow viewports |
|----------|-------------------------------------|
| `primary` | Always visible (catalog chips, table columns) |
| `secondary` | Hidden below `md` unless expanded |
| `tertiary` | Hidden below `lg` |
| `operator` | Table-only; visible at `xl`+ |

Implementation: `frontend/src/lib/contentPriorityCollapse.ts`, column tiers in `metadataConfig.ts`.

**Rules:** less important metadata disappears before typography shrinks; supporting chips collapse to expand; never `overflow-x-auto` on primary reading/catalog surfaces.

## Layout containment

Horizontal scrollbars on narrative surfaces indicate a **layout containment** failure — fix with `min-w-0`, grid/flex reflow, and priority collapse. Do not narrow prose or shrink font-size to eliminate overflow.

## Composition doctrine

Asymmetry and intentional void — not more widgets:

| Stance | Routes | Intent |
|--------|--------|--------|
| `hero_dominant` | Campaign Home | Focal column 1.45× contextual rail; staggered widget weights |
| `editorial_stream` | Codex, reference | Readable column + receded rail |
| `entity_workspace` | Entity detail pages | Wider focal (1.42×); narrative node surfaces |
| `hub_stagger` | Category hubs | Entity catalogs: `entity-catalog-grid`; table as operator toggle |
| `studio_field` | Chronology, maps, party | Canvas-first; soft grouping over card grids |

Constants in `frontend/src/lib/compositionDoctrine.ts`. Hard rules:

- **One** visually dominant focal column per narrative view
- Preserve **void bands** (`canvas-recess`) between hero and stream — no filler cards
- Operational chrome defaults receded until hover (`narrative-chrome-recede`, `sidebar-narrative-recede`)
- Status/KPI metadata collapsed behind expand on Campaign Home hero
