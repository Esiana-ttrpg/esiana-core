# Adventure (Narrative Workspace)

**Layer:** 5 — Narrative Workspace  
**Entry:** Adventure wiki category (`systemCategoryKey: quests`) → **Adventure** shell

Adventure is the campaign's operational narrative layer — active quests, arcs, threads, and continuity.

## Workspace sections (header tabs)

| Section | Purpose |
|---------|---------|
| **Story** | Living campaign state — quests, arcs, threads, unresolved, investigation lenses |
| **Timeline** | Chronology overlay (embedded projection) — canonical time |

## Story lenses (not route-level tabs)

Use `?section=story&view=<lens>`:

| Lens | Purpose |
|------|---------|
| **Quests** | Quest list + kanban (default) — single toolbar row with search, refine, list/board, and right-aligned **New Quest** |
| **Arcs** | Campaign arc hierarchy projection |
| **Threads** | Narrative thread hub; optional **Recent Activity** secondary lens (`threadsLens=activity`) |
| **Unresolved** | Creative drift scan — cooling/stale entities |
| **Investigation** | Clue & lead dependency matrix + topology (GM only) |

**Quests** owns its own toolbar (no Story-level search row). **Threads** and **Unresolved** use a slim Story toolbar (search + Recent only). **DM / Party** preview is global in the workspace rail only — not duplicated in Story chips.

**Campaign pulse** (active arcs, unresolved count, pressure signals) lives in **Progression › Insights**, not Story.

## Continuity

Not a navigation tab. Continuity appears in the **contextual rail** (narrative pressure feed) with a drawer for full diagnostics. Per-page continuity remains in wiki codex rails. The full pressure feed also appears in Progression › Insights.

## Authoring surfaces (Progression)

Scene planning and inline authoring live in **Progression**:

| Progression section | Purpose |
|--------------------|---------|
| **Scenes** | Editor-first scene workspace — Outline (default), Board, Sequence lenses |
| **Session Prep** | Next-session planning (formerly Sessions) |
| **Insights** | Campaign pulse, continuity pressure, trajectories, drift summary, authoring analytics |

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
| **Progression › Scenes › Sequence** | Authorial scene ordering — `plannedSessionId`, `sortOrder` |
| **Chronology Hub** | Full calendar/timeline/events authoring |

## Legacy redirects

| Old URL | Redirect |
|---------|----------|
| `?section=board` | `?section=story&view=quests` |
| `?section=scenes` | `/progression?section=scenes` |
| `?section=scene-timeline` | `/progression?section=scenes&view=sequence` |
| `?section=storyboard` | `/progression?section=scenes&view=board` |
| `?section=sceneSequence` | `/progression?section=scenes&view=sequence` |
| `?section=trajectories` | `/progression?section=insights` |
| `?section=authoringWorkshop` | `/progression?section=insights` (preserves authoring params) |
| `?section=thread-history` | `?section=story&view=threads&threadsLens=activity` |
| `/narrative/unresolved` | Story › Unresolved lens |

## APIs

```
GET  /c/:slug/wiki/adventure-hub
GET  /c/:slug/wiki/adventure-hub/:pageId?section=scenes
GET  /c/:slug/wiki/adventure-hub/:pageId?section=scene-timeline
GET  /c/:slug/wiki/adventure-hub/:pageId?section=thread-history
```

Backend section params unchanged; Progression **Scenes › Board** maps to adventure-hub `scenes`; **Scenes › Sequence** maps to `scene-timeline`.
