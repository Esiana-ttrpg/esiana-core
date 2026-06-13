# Hidden content reachability (Layer 4)

**Layer:** 4 — Diagnostics & Integrity  
**Status:** v1 implemented  
**Roadmap:** [todo.md](../../todo.md) — Hidden content reachability checks

## Purpose

Deterministic **activation-path linting** for `HIDDEN` branch nodes on quest and open-thread subjects. Flags secret branches that cannot be reached from public (`OUTCOME`) entry roots via satisfiable transition conditions.

Complements [narrative-dead-end-detection.md](./narrative-dead-end-detection.md) (structural reachability treats all edges as unconditional) and uses the same continuity API surfaces.

## API surfaces

| Endpoint | Role |
|----------|------|
| `GET /c/:slug/wiki/:pageId/continuity` | Page-scoped hidden-reachability issues on quest/thread subjects |
| `GET /c/:slug/wiki/continuity-summary` | Campaign-wide issues (capped at 50) |

DM/Writer only (same gate as dead-end detection).

## Pipeline

```
loadNarrativeDiagnosticSubjects → buildActivationConditionIndex → detectHiddenReachabilityIssues → buildNarrativeHiddenReachabilityIssues → wikiContinuityService
```

| Module | Role |
|--------|------|
| [`shared/narrativeHiddenReachability.ts`](../../shared/narrativeHiddenReachability.ts) | Pure activation BFS + condition satisfiability |
| [`shared/narrativeBranchAnalysis.ts`](../../shared/narrativeBranchAnalysis.ts) | Shared entry resolution + graph-edge keys |
| [`backend/src/lib/buildActivationConditionIndex.ts`](../../backend/src/lib/buildActivationConditionIndex.ts) | Live graph-edge index (integrity + provenance freshness) |
| [`backend/src/lib/narrativeHiddenReachabilityScan.ts`](../../backend/src/lib/narrativeHiddenReachabilityScan.ts) | Campaign DB load + index build |
| [`backend/src/lib/buildNarrativeHiddenReachabilityIssues.ts`](../../backend/src/lib/buildNarrativeHiddenReachabilityIssues.ts) | `ContinuityIssue` mapping |
| [`shared/continuityIssue.ts`](../../shared/continuityIssue.ts) | Issue contract (`producer: narrative_hidden_reachability_analyzer`) |

## v1 rules

### Structural (`issueCategory: structural`)

| Rule | Issue type | Severity |
|------|------------|----------|
| `HIDDEN` node not activation-reachable from `OUTCOME` entry roots | `narrative_unreachable_hidden` | warning (info if recently edited) |

**Activation entry roots:** resolved entry nodes filtered to `kind === outcome` only. Nodes listed in `entryNodeIds` are exempt (explicit GM activation roots).

**Edge traversability:** source must be activation-reachable AND edge condition must be statically satisfiable:

| Condition | Satisfiable when |
|-----------|------------------|
| *(none)* | always |
| `manual_flag` | always (GM-operated) |
| `lifecycle` | subject exists; current lifecycle can reach target state |
| `calendar_event` | event exists in campaign |
| `graph_edge` | **live** entity relation (see below) |

### Live graph-edge predicate

Naive “row exists” would keep hidden branches activatable on stale derived edges. v1 requires:

1. Both wiki endpoints non-deleted
2. Edge not flagged by `diagnoseEntityRelationIntegrity` (dangling/orphan)
3. `sourceRecordKey` still re-derivable from current wiki metadata + outgoing `WikiLink` rows (`extractWikiPageGraphEdges`)
4. Edge active at campaign chronology now (`startDate` / `endDate` when present)

**Forward compatibility:** when `EntityRelation.status` ships, add `status !== REMOVED` inside the live-edge predicate in `buildActivationConditionIndex.ts`.

## UI

- **Codex Continuity panel** — issues under Graph structure (`issueCategory: structural`)
- **World maintenance** — Narrative structure section

## v1 limits

- Quest + open-thread subjects only (no Scene/Clue entity types)
- Within-subject branch graph only — no cross-quest consequence activation
- `manual_flag` edges always treated as potentially activatable
- No runtime party knowledge / revelation simulation
- Calendar/map-sourced `graph_edge` conditions: provenance freshness v1 covers wiki-page extraction only

## Related

- [narrative-dead-end-detection.md](./narrative-dead-end-detection.md) — structural dead ends and unreachable terminals
- [continuity-warnings.md](./continuity-warnings.md) — temporal + link integrity
- [entity-graph.md](./entity-graph.md) — derived `EntityRelation` substrate
