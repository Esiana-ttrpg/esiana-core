# Narrative density metrics (Layer 4)

**Layer:** 4 — Diagnostics & Integrity  
**Status:** v1 implemented  
**Module:** [`shared/narrativeDensityMetrics.ts`](../../shared/narrativeDensityMetrics.ts)

## Purpose

Campaign-level **narrative density observability** split into authored complexity vs world-state complexity — avoids penalizing lore-rich but structurally simple campaigns.

## Metrics payload

`continuity-summary` includes `narrativeDensity: NarrativeDensityMetrics`:

### Authored complexity

- Branching depth per quest/thread subject
- Clue density (`cluesPerActiveQuest`, SPOF count from clue redundancy analyzer)
- Bottleneck and terminal counts

### World-state complexity

- Unresolved thread counts by kind/status
- Active factions, narrative entities, chronology event load
- Campaign totals (active quests, open authored threads)

### `narrativeClusterComplexity`

Quest-parent clustering heuristic approximating localized narrative density.

> **Not canonical act structure.** Does not represent authored act/arc hierarchy (Layer 5).

## Threshold warnings

Optional `ContinuityIssue` emissions when thresholds exceeded (authored complexity only):

| Threshold | Issue type |
|-----------|------------|
| Branch depth > 6 | `narrative_density_high_branching` |
| Clues per active quest > 8 | `narrative_density_clue_overload` |
| SPOF clues > 0 | `narrative_density_clue_spof` |
| Cluster depth > 8 | `narrative_density_cluster_complexity` |
| Open authored threads > 25 | `narrative_density_thread_overload` |

Producer: `narrative_density_analyzer`

## Related

- [narrative-clue-redundancy.md](./narrative-clue-redundancy.md)
- [narrative-orphan-analysis.md](./narrative-orphan-analysis.md)
