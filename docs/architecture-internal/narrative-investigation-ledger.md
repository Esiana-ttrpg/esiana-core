# Clue & lead dependency ledger (Layer 5)

**Layer:** 5 — Narrative Workspace  
**Module:** [`shared/investigationDependencyLedger.ts`](../../shared/investigationDependencyLedger.ts)

## Purpose

Read-only **investigation matrix** in Adventure › Investigation linking clues, leads, discoveries, NPCs, scenes, and unlocked locations. Projects wiki-canonical Layer 2 metadata — no duplicate content store.

| Surface | Role |
|---------|------|
| **Adventure › Investigation › Dependency matrix** | Cross-reference grid with explainable provenance |
| **Adventure › Investigation › Topology** | Enriched node graph (clues, leads, scenes, NPCs, locations, unlocks) |
| **Threads Hub** | Author threads, `relatedPageIds`, payoffs |
| **Scene pages** | Link clues/threads, participants, outcomes |

## Matrix axes

| Row kind | Source |
|----------|--------|
| **Clue** | Authored `threadKind: clue` (non-theory, non-player-submitted) |
| **Lead** | Authored `mystery` / `foreshadowing` / `promise` with investigation adjacency |

| Column group | Source |
|--------------|--------|
| **Scenes** | Investigation-linked scenes (`linkedCluePageIds`, `linkedThreadPageIds`, or `sceneKind: investigation`) |
| **NPCs** | `participantPageIds` on linked scenes; character-category `relatedPageIds` |
| **Locations** | Scene `locationPageId`; `location_unlock` outcome `linkedPageIds[]` |
| **Discoveries** | Party-visible threads/scenes; `information_revealed` outcomes; thread payoffs; lead→clue links |

## Edge derivation

| relationKind | derivationSource | Edit in |
|--------------|------------------|---------|
| `SCENE_CLUE` | `linkedCluePageIds` | Scene wiki |
| `SCENE_THREAD` | `linkedThreadPageIds` | Scene wiki |
| `SCENE_PARTICIPANT` | `participantPageIds` | Scene wiki |
| `SCENE_LOCATION` | `locationPageId` | Scene wiki |
| `THREAD_RELATED` | `relatedPageIds` | Thread wiki |
| `THREAD_PAYOFF` | `payoffPageId` | Thread wiki |
| `SCENE_OUTCOME_LOCATION_UNLOCK` | `outcomes[].linkedPageIds` | Scene wiki |
| `INVESTIGATION_DISCOVERY` | lifecycle + `information_revealed` | Lifecycle / scene outcomes |

Provenance templates reuse [`STORYBOARD_EDGE_PROVENANCE`](../../shared/storyboardEdgeDerivation.ts) where applicable.

## Layer 4 overlays

- **SPOF** (`spof_risk` edge kind) — from clue redundancy analyzer
- **Unreachable** — from hidden reachability analyzer; rows/columns may show “not party-visible”

## Player projection

Party / player preview sees only lifecycle-visible threads and scenes (`DISCOVERED`+). GM view shows full authored graph.

## API

Investigation slice on adventure hub:

```
GET /c/:slug/wiki/adventure-hub/:pageId?section=investigation
```

Payload includes `ledger: { rows, columns, cells, legend }` plus enriched `nodes` / `edges` for topology tab.

## Related

- [adventure.md](./adventure.md)
- [narrative-threads.md](./narrative-threads.md)
- [narrative-clue-redundancy.md](./narrative-clue-redundancy.md)
- [narrative-storyboard.md](./narrative-storyboard.md) — storyboard `investigation` mode uses overlapping edge kinds
