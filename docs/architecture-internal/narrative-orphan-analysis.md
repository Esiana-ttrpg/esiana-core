# Orphaned content analysis (Layer 4)

**Layer:** 4 — Diagnostics & Integrity  
**Status:** v1 implemented  
**Modules:** [`shared/narrativeOrphanAnalysis.ts`](../../shared/narrativeOrphanAnalysis.ts), [`shared/narrativeConnectivity.ts`](../../shared/narrativeConnectivity.ts)

## Purpose

Unified **tiered orphan analysis** for narrative entities — structural isolation, narrative disconnection, and temporal inactivity. Distinct from:

- `unlinked_entity` (inbound wikilink isolation)
- Creative drift inbox (advisory dormancy)
- Entity-graph diagnostics API (now shares structural isolation helper)

## Tiered isolation model

| Class | Rules | Meaning |
|-------|-------|---------|
| **Structural** | `entity_graph_isolated`, `quest_isolated`, `thread_unconnected` | Participates nowhere in playable narrative state |
| **Narrative** | `npc_narratively_disconnected` | Has graph presence but fails weighted connectivity to active play |
| **Temporal** | `faction_inactive` | Organization with no active quest/thread participation |

## Structural isolation (multi-condition)

An entity is structurally isolated only when **all** are true:

- No non-`PAGE_PARENT` entity-relation edges
- No inbound wikilinks
- No authored thread participation (`relatedPageIds` or `THREAD_*` edges)
- No quest participation (metadata, consequences, branch conditions)
- No chronology linkage
- Not a continuity root
- Not draft lifecycle (quest/thread subjects)

## Weighted connectivity

NPC narrative disconnection uses bounded BFS with edge weights (`strong` / `weak` / `structural`) — not raw hop count. See [`narrativeConnectivity.ts`](../../shared/narrativeConnectivity.ts).

## API

Uses existing continuity endpoints (DM/Writer):

| Endpoint | Role |
|----------|------|
| `GET /c/:slug/wiki/continuity-summary` | Campaign-wide orphan issues (priority-truncated with other Layer 4 analyzers) |
| `GET /c/:slug/wiki/:pageId/continuity` | Page-scoped orphan issues |

Producer: `narrative_orphan_analyzer`

## UI

World Maintenance → **Orphaned content** with subsections by isolation class.

## Related

- [continuity-warnings.md](./continuity-warnings.md)
- [entity-graph.md](./entity-graph.md)
- [creative-drift.md](./creative-drift.md) (non-goal overlap)
