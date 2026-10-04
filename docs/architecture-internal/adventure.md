# Adventure (Narrative Workspace)

**Layer:** 5 — Narrative Workspace  
**Entry:** Adventure wiki category (`systemCategoryKey: quests`) → **Adventure** shell

Adventure is the campaign's operational narrative layer — active quests, arcs, threads, continuity, and GM scene planning.

## Workspace sections (header tabs)

| Section | Purpose |
|---------|---------|
| **Story** | Living campaign state — quests, arcs, threads, unresolved, investigation, scenes, storyboard lenses |
| **Timeline** | Chronology overlay (embedded projection) — canonical time |

## Story lenses (not route-level tabs)

Use `?view=<lens>`:

| Lens | Purpose |
|------|---------|
| **Quests** | Quest list + kanban (default) — single toolbar row with search, refine, list/board, and right-aligned **New Quest** |
| **Arcs** | Campaign arc hierarchy projection |
| **Threads** | Narrative thread hub; optional **Recent Activity** secondary lens (`threadsLens=activity`) |
| **Unresolved** | Creative drift scan — cooling/stale entities |
| **Investigation** | Clue & lead dependency matrix + topology (GM only) |
| **Scenes** | GM only — collection of scene content (outline editors) |
| **Storyboard** | GM only — arrange and rapidly create scenes (Board / Sequence, ready scenes, lane presets) |

**Quests** owns its own toolbar (no Story-level search row). **Threads** and **Unresolved** use a slim Story toolbar (search + Recent only). **DM / Party** preview is global in the workspace rail only — not duplicated in Story chips.

**Campaign pulse** is not an Adventure destination. Dashboard widgets may surface pulse signals; Adventure owns Unresolved and Continuity drawer instead of an Insights aggregation.

## Continuity

Not a navigation tab. Continuity appears in the **contextual rail** (narrative pressure feed) with a drawer for full diagnostics. Per-page continuity remains in wiki codex rails.

## Authoring surfaces (Adventure GM lenses)

Scene planning and inline authoring live under **Adventure**, not Progression:

| Adventure lens | Purpose |
|----------------|---------|
| **Scenes** | Editor-first scene content collection |
| **Storyboard** | Planning/assembly — Board canvas, Sequence columns, READY scenes, storyboard lane presets |

## Thread history

| Tier | Entry |
|------|-------|
| **Per-thread** | Thread wiki detail page — foreshadowing milestone panel |
| **Aggregate** | Story › Threads › Recent Activity lens (GM only) |

## Arc hierarchy

**Modules:** [`shared/arcMetadata.ts`](../../shared/arcMetadata.ts), [`shared/arcHierarchyProjection.ts`](../../shared/arcHierarchyProjection.ts)

Projection loads when Story › Arcs lens is active. Storyboard act-lane filter uses precomputed ancestry maps.

## Investigation vs Threads

| Surface | Role |
|---------|------|
| **Story › Investigation** | Dependency matrix + topology graph |
| **Story › Threads** | Create and browse thread pages |

## Timeline surfaces

| Surface | Role |
|---------|------|
| **Adventure › Timeline** | Embedded convergence feed |
| **Adventure › Storyboard › Sequence** | Authorial scene ordering — `plannedSessionId`, `sortOrder` |
| **Chronology Hub** | Full calendar/timeline/events authoring |

Legacy `?section=` Adventure URLs and `/narrative/unresolved` have been removed (no redirects). Use `?view=` lenses and Adventure › Unresolved.

## APIs

```
GET  /c/:slug/wiki/adventure-hub
GET  /c/:slug/wiki/adventure-hub/:pageId?section=scenes
GET  /c/:slug/wiki/adventure-hub/:pageId?section=scene-timeline
GET  /c/:slug/wiki/adventure-hub/:pageId?section=sessions
GET  /c/:slug/wiki/adventure-hub/:pageId?section=thread-history
```

Backend section params unchanged; Adventure **Scenes** maps to adventure-hub `scenes`; **Storyboard › Board** maps to `scenes` (storyboard projection); **Storyboard › Sequence** maps to `scene-timeline`.
