# Narrative storyboard (Layer 5)

**Storage:** `storyboard-view-v1` on hidden wiki page `__storyboard_layout__` under Quests category root.

Storyboard is a **projection-only view layer** — coordinates, lanes, visibility filters, and annotations never duplicate wiki narrative text.

## Separation of concerns

| Concern | Canonical source |
|---------|------------------|
| Scene content, outcomes, links | Scene wiki pages (`scene-metadata-v1`) |
| Sequence semantics | Entity graph `SCENE_FOLLOWS` edges (from `followsScenePageIds`) |
| Investigation / quest links | Entity graph `SCENE_THREAD`, `SCENE_CLUE`, `SCENE_QUEST`, etc. |
| Canvas positions, act lanes, filters | `storyboard-view-v1` layout metadata |
| GM sticky notes on canvas | `layout.annotations[]` (view chrome only) |

**Deprecated:** `layout.edges[]` is ignored at projection time. Semantic edges are derived from the entity graph, not stored in layout.

## Architectural invariants

1. **Wiki-canonical** — entity titles, beats, and relationships resolve live from wiki metadata at render time.
2. **Layout-only writes** — drag, lanes, filters, and palette pins PATCH layout metadata only.
3. **Canonical edge edits** — scene sequence connect/disconnect updates `followsScenePageIds` on the source scene wiki page.
4. **Explainable edges** — every projected edge exposes `relationKind`, `derivationSource`, and `explanation` (see provenance catalog below).
5. **Stale node hygiene** — layout nodes referencing deleted entities are marked `missing`; PATCH prunes invalid refs.

## Edge provenance contract

Catalog: `STORYBOARD_EDGE_PROVENANCE` in [`shared/storyboardEdgeDerivation.ts`](../../shared/storyboardEdgeDerivation.ts).

| relationKind | derivationSource | editable (v1) |
|--------------|------------------|---------------|
| `SCENE_FOLLOWS` | `followsScenePageIds` | yes |
| `SCENE_THREAD` | `linkedThreadPageIds` | no |
| `SCENE_CLUE` | `linkedCluePageIds` | no |
| `SCENE_QUEST` | `linkedQuestPageIds` | no |
| `OBJECTIVE_SCENE` | `linkedObjectivePageIds` | no |
| `SCENE_PARTICIPANT` | `participantPageIds` | no |
| `SCENE_LOCATION` | `locationPageId` | no |

### Per-mode edge sets

| activeMode | relation kinds surfaced |
|------------|-------------------------|
| `arc_flow` | `SCENE_FOLLOWS` |
| `investigation` | `SCENE_CLUE`, `SCENE_THREAD`, `THREAD_RELATED`, `THREAD_PAYOFF` |
| `session_prep` | `SCENE_FOLLOWS`, `SCENE_QUEST`, `OBJECTIVE_SCENE`, `QUEST_OBJECTIVE`, `SCENE_PARTICIPANT`, `SCENE_LOCATION` |
| `continuity` | all scene-related kinds (risk overlay) |

Mode legend text is returned on `StoryboardProjection.modeLegend`.

## API

```
GET   /c/:slug/adventure/storyboard
PATCH /c/:slug/adventure/storyboard
```

Adventure hub `section=scenes` returns `storyboard` projection, entity `palette`, and `presets`.

Resolver: `buildStoryboardProjection()` + `deriveStoryboardEdges()` in [`shared/storyboardProjection.ts`](../../shared/storyboardProjection.ts).

## Presets

Non-destructive lane + mode scaffolds (`STORYBOARD_PRESETS`) — three-act campaign, mystery investigation, five-beat session. Never mutates wiki pages.
