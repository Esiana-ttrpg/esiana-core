# Clue redundancy analysis (Layer 4)

**Layer:** 4 — Diagnostics & Integrity  
**Status:** v1 implemented  
**Module:** [`shared/narrativeClueRedundancy.ts`](../../shared/narrativeClueRedundancy.ts)

## Purpose

Detect **single-point-of-failure clue paths** and **progression bottlenecks** in quest and open-thread branch graphs.

## Redundancy definition

Redundancy means at least two **independently satisfiable** progression paths from currently reachable state — not merely counting clue producers.

Uses:

- [`isBranchConditionSatisfiable`](../../shared/narrativeHiddenReachability.ts) (hidden reachability index)
- Forward/reverse reachability on branch subgraphs
- Articulation-point approximation (no exponential path enumeration)

## Rules

| Rule | Issue type | Severity |
|------|------------|----------|
| `clue_no_alternative_path` | `narrative_clue_single_point_of_failure` | warning |
| `progression_articulation_point` | `narrative_progression_bottleneck` | info |

Producer: `narrative_clue_redundancy_analyzer`

## Related

- [narrative-hidden-reachability.md](./narrative-hidden-reachability.md)
- [narrative-orphan-analysis.md](./narrative-orphan-analysis.md)
