# Dead-end narrative detection (Layer 4)

**Layer:** 4 — Diagnostics & Integrity  
**Status:** v1 implemented  
**Roadmap:** [todo.md](../../todo.md) — Dead-end narrative detection

## Purpose

Deterministic **narrative structure linting** for quest and open-thread subjects — dead-end branch nodes, unreachable conclusions, broken consequence chains, and unresolved thread payoffs. No AI, no schema changes.

Complements [continuity-warnings.md](./continuity-warnings.md) (temporal + link integrity) and is distinct from Layer 3 [creative-drift.md](./creative-drift.md) (advisory “dormant/cooling” inbox).

## API surfaces

Uses existing continuity endpoints (DM/Writer only for narrative rules):

| Endpoint | Role |
|----------|------|
| `GET /c/:slug/wiki/:pageId/continuity` | Page-scoped narrative issues on quest/thread subjects |
| `GET /c/:slug/wiki/continuity-summary` | Campaign-wide narrative issues (capped at 50) |

## Pipeline

```
narrativeDeadEndScan → normalizeNarrativeSubject → detectNarrativeDeadEnds → buildNarrativeDeadEndIssues → wikiContinuityService
```

| Module | Role |
|--------|------|
| [`shared/narrativeDeadEnd.ts`](../../shared/narrativeDeadEnd.ts) | Pure normalization + rule passes |
| [`backend/src/lib/narrativeDeadEndScan.ts`](../../backend/src/lib/narrativeDeadEndScan.ts) | Campaign DB load, presence map, consequence reference index |
| [`backend/src/lib/buildNarrativeDeadEndIssues.ts`](../../backend/src/lib/buildNarrativeDeadEndIssues.ts) | `ContinuityIssue` mapping |
| [`shared/continuityIssue.ts`](../../shared/continuityIssue.ts) | Issue contract (`producer: narrative_dead_end_analyzer`) |

## v1 rules

### Structural (`issueCategory: structural`)

| Rule | Issue type | Severity |
|------|------------|----------|
| Non-terminal leaf (no outgoing edges; not outcome/failure/merge) | `narrative_dead_end` | warning |
| Terminal node unreachable from resolved entry path | `narrative_unreachable_conclusion` | warning (skip draft subjects) |
| Dangling edge — recent edit / draft subject | `narrative_broken_chain` | info (`branch_stale_edge`) |
| Dangling edge — persisted on published subject | `narrative_broken_chain` | critical (warning if draft) |

**Entry-node resolution order:** `entryNodeIds` metadata → `activeNodeId` → structural roots → prefer `outcome` → lexicographic tie-break.

Optional `entryNodeIds` on [`NarrativeBranchGraph`](../../shared/narrativeBranch.ts) (backward-compatible metadata JSON).

### System consistency (`issueCategory: system_consistency`)

| Rule | Issue type | Severity |
|------|------------|----------|
| Consequence targets missing page | `narrative_broken_chain` | critical (warning if subject is draft) |
| Consequence `on_enter_node` references missing branch node | `narrative_broken_chain` | critical (warning if draft) |
| Consequence target page is `DRAFT` | `narrative_broken_chain` | warning |

### Narrative intent (`issueCategory: narrative_intent`)

| Rule | Issue type | Severity |
|------|------------|----------|
| Foreshadowing OPEN, no payoff (soft) | `narrative_unresolved_thread` | info |
| Promise / critical weight / consequence-referenced thread OPEN, no payoff | `narrative_incomplete_arc` | warning |
| Active quest, branch graph, no reachable terminal, no lifecycle consequence hook | `narrative_incomplete_arc` | warning |

Escalation signals: `threadKind === promise`, `narrativeWeight === critical`, subject referenced by any campaign consequence rule.

v1 does **not** flag `mystery`, `clue`, or `theory` threads.

## UI

- **Codex Continuity panel** — issues grouped by `issueCategory` within severity bands
- **World maintenance** — “Narrative structure” section with Graph structure / System links / Narrative threads subsections

## v1 limits

- Quest + open-thread wiki subjects only (no Scene/Clue entity types)
- HIDDEN-branch activation reachability — see [narrative-hidden-reachability.md](./narrative-hidden-reachability.md)
- Circular dependency detection — see [narrative-circular-dependency.md](./narrative-circular-dependency.md)
- No entity-graph `unreachable` check
- No `requiresPayoff` metadata — uses existing weight/kind/consequence refs
- Recomputed per request; read-only (does not block saves)

## Related

- [narrative-lifecycle.md](./narrative-lifecycle.md) — Layer 2 quest/thread lifecycle
- [narrative-threads.md](./narrative-threads.md) — thread metadata
- [entity-graph.md](./entity-graph.md) — Layer 1 graph (separate diagnostics)
