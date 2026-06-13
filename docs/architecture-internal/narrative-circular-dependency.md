# Circular dependency detection (Layer 4)

**Layer:** 4 — Diagnostics & Integrity  
**Status:** v1 implemented  
**Roadmap:** [todo.md](../../todo.md) — Circular dependency detection

## Purpose

Deterministic **cycle linting** for narrative progression graphs — within-subject branch loops, cross-subject unlock dependency clusters, and calendar prerequisite cycles. Uses **Tarjan SCC** detection with **canonical cycle fingerprints** (not exhaustive simple-cycle enumeration).

Complements [narrative-dead-end-detection.md](./narrative-dead-end-detection.md) and [narrative-hidden-reachability.md](./narrative-hidden-reachability.md) on the same continuity API surfaces.

## API surfaces

| Endpoint | Role |
|----------|------|
| `GET /c/:slug/wiki/:pageId/continuity` | Page-scoped cycle issues when the page is any cycle participant |
| `GET /c/:slug/wiki/continuity-summary` | Campaign-wide cycle issues (capped at 50) |

DM/Writer only (same gate as other narrative structure linting).

## Pipeline

```
loadNarrativeDiagnosticSubjects → detectBranchCycles / detectUnlockCycles / extractCalendarPrerequisiteCycles → buildNarrativeCircularDependencyIssues → wikiContinuityService
```

| Module | Role |
|--------|------|
| [`shared/narrativeCircularDependency.ts`](../../shared/narrativeCircularDependency.ts) | Pure extraction, Tarjan SCC, canonicalization |
| [`backend/src/lib/narrativeCircularDependencyScan.ts`](../../backend/src/lib/narrativeCircularDependencyScan.ts) | Campaign DB load, calendar edge load, caps |
| [`backend/src/lib/buildNarrativeCircularDependencyIssues.ts`](../../backend/src/lib/buildNarrativeCircularDependencyIssues.ts) | `ContinuityIssue` mapping (`producer: narrative_circular_dependency_analyzer`) |
| [`shared/continuityIssue.ts`](../../shared/continuityIssue.ts) | Issue contract + `relatedPageIds` for cycle UI links |

## v1 rules

### Structural (`issueCategory: structural`)

| Rule | Issue type | Severity |
|------|------------|----------|
| Directed SCC in subject branch graph | `narrative_branch_cycle` | warning |

### System consistency (`issueCategory: system_consistency`)

| Rule | Issue type | Severity |
|------|------------|----------|
| Cross-subject unlock dependency SCC (lifecycle conditions, consequence discover chains, calendar-event branch gates) | `narrative_unlock_cycle` | critical if any wiki participant is published; warning if all draft |
| Calendar event prerequisite SCC | `calendar_prerequisite_cycle` | warning |

**Unlock graph edges (prerequisite → dependent):**

| Source | Edge |
|--------|------|
| Branch `lifecycle` condition on **D** referencing **P** | **P → D** |
| Consequence `discover_quest` / `discover_wiki_page` on **P** targeting narrative subject **D** | **P → D** |
| Branch `calendar_event` condition on **D** | **event → D** |

**Excluded:** `manual_flag` (satisfiable terminal), `graph_edge` (structural topology, not progression gating).

### SCC semantics

- Tarjan SCC on directed graphs; size-1 components ignored unless self-loop
- One finding per SCC cluster (not every simple cycle)
- Canonical fingerprint: rotate to lex-min start, compare forward vs reverse, serialize `id1>id2>id3`
- Large clusters (>25 participants): summarized finding with truncated participant list

### Page-scoped emission

Emit when `filterPageId` is **any participant** in the cluster (cycles are shared topology defects, not owner defects).

## UI

- **Codex Continuity panel** — grouped under Graph structure / System links; cycle rows show canonical participant wiki links
- **World maintenance** — Narrative structure section

## v1 limits

- Quest + open-thread wiki subjects; Scene/Clue entity types deferred (taxonomy hooks only)
- Branch SCC detection may flag **intentional revisit loops** (repeatable hubs, patrol states) — graph metadata lacks progression-edge classification today
- Calendar cycles appear on global continuity summary; calendar events are not wiki-linked in v1
- Read-only lint; does not block saves
- Entity-graph `/diagnostics` endpoint unchanged (continuity API is primary UX)

## Related

- [continuity-warnings.md](./continuity-warnings.md) — temporal + link integrity
- [narrative-dead-end-detection.md](./narrative-dead-end-detection.md) — dead-end / broken-chain linting
- [narrative-hidden-reachability.md](./narrative-hidden-reachability.md) — hidden branch activation paths
- [entity-graph.md](./entity-graph.md) — Layer 1 infrastructure (calendar `findCycles` wrapped via narrative adapter)
