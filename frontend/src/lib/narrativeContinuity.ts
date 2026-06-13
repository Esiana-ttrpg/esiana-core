import type {
  ContinuityIssue,
  ContinuityIssueType,
} from '@shared/continuityIssue';

export const NARRATIVE_STRUCTURE_TYPES: ReadonlySet<ContinuityIssueType> = new Set([
  'narrative_dead_end',
  'narrative_unreachable_conclusion',
  'narrative_unreachable_hidden',
  'narrative_broken_chain',
  'narrative_unresolved_thread',
  'narrative_incomplete_arc',
  'narrative_branch_cycle',
  'narrative_unlock_cycle',
  'calendar_prerequisite_cycle',
  'narrative_orphan_entity',
  'narrative_orphan_npc',
  'narrative_orphan_faction',
  'narrative_orphan_thread',
  'narrative_orphan_quest',
  'narrative_clue_single_point_of_failure',
  'narrative_progression_bottleneck',
  'narrative_foreshadowing_no_reminder',
  'narrative_foreshadowing_stale',
  'narrative_foreshadowing_no_payoff',
  'narrative_density_high_branching',
  'narrative_density_clue_overload',
  'narrative_density_clue_spof',
  'narrative_density_cluster_complexity',
  'narrative_density_thread_overload',
]);

/** @deprecated Use NARRATIVE_STRUCTURE_TYPES */
export const NARRATIVE_DEAD_END_TYPES = NARRATIVE_STRUCTURE_TYPES;

export const NARRATIVE_ORPHAN_TYPES: ReadonlySet<ContinuityIssueType> = new Set([
  'narrative_orphan_entity',
  'narrative_orphan_npc',
  'narrative_orphan_faction',
  'narrative_orphan_thread',
  'narrative_orphan_quest',
]);

export type NarrativeIsolationClass = 'structural' | 'narrative' | 'temporal';

const ORPHAN_TYPE_TO_ISOLATION: Partial<
  Record<ContinuityIssueType, NarrativeIsolationClass>
> = {
  narrative_orphan_entity: 'structural',
  narrative_orphan_quest: 'structural',
  narrative_orphan_thread: 'structural',
  narrative_orphan_npc: 'narrative',
  narrative_orphan_faction: 'temporal',
};

export const NARRATIVE_ISOLATION_LABELS: Record<NarrativeIsolationClass, string> = {
  structural: 'Structural isolation',
  narrative: 'Narrative disconnection',
  temporal: 'Temporal inactivity',
};

export const NARRATIVE_ISOLATION_ORDER: NarrativeIsolationClass[] = [
  'structural',
  'narrative',
  'temporal',
];

export const NARRATIVE_CLUE_TYPES: ReadonlySet<ContinuityIssueType> = new Set([
  'narrative_clue_single_point_of_failure',
  'narrative_progression_bottleneck',
]);

export const NARRATIVE_FORESHADOWING_TYPES: ReadonlySet<ContinuityIssueType> = new Set([
  'narrative_foreshadowing_no_reminder',
  'narrative_foreshadowing_stale',
  'narrative_foreshadowing_no_payoff',
]);

export const NARRATIVE_DENSITY_TYPES: ReadonlySet<ContinuityIssueType> = new Set([
  'narrative_density_high_branching',
  'narrative_density_clue_overload',
  'narrative_density_clue_spof',
  'narrative_density_cluster_complexity',
  'narrative_density_thread_overload',
]);

export const NARRATIVE_CYCLE_TYPES: ReadonlySet<ContinuityIssueType> = new Set([
  'narrative_branch_cycle',
  'narrative_unlock_cycle',
  'calendar_prerequisite_cycle',
]);

export const NARRATIVE_CONTINUITY_CATEGORY_LABELS: Record<
  import('@shared/continuityIssue').ContinuityIssueCategory,
  string
> = {
  structural: 'Graph structure',
  system_consistency: 'System links',
  narrative_intent: 'Narrative threads',
};

const TYPE_TO_CATEGORY: Partial<
  Record<ContinuityIssueType, import('@shared/continuityIssue').ContinuityIssueCategory>
> = {
  narrative_dead_end: 'structural',
  narrative_unreachable_conclusion: 'structural',
  narrative_unreachable_hidden: 'structural',
  narrative_branch_cycle: 'structural',
  narrative_clue_single_point_of_failure: 'structural',
  narrative_progression_bottleneck: 'structural',
  narrative_orphan_entity: 'structural',
  narrative_orphan_quest: 'structural',
  narrative_orphan_thread: 'structural',
  narrative_density_high_branching: 'structural',
  narrative_density_cluster_complexity: 'structural',
  narrative_broken_chain: 'system_consistency',
  narrative_unlock_cycle: 'system_consistency',
  calendar_prerequisite_cycle: 'system_consistency',
  narrative_orphan_faction: 'system_consistency',
  narrative_unresolved_thread: 'narrative_intent',
  narrative_incomplete_arc: 'narrative_intent',
  narrative_orphan_npc: 'narrative_intent',
  narrative_foreshadowing_no_reminder: 'narrative_intent',
  narrative_foreshadowing_stale: 'narrative_intent',
  narrative_foreshadowing_no_payoff: 'narrative_intent',
  narrative_density_clue_overload: 'narrative_intent',
  narrative_density_clue_spof: 'narrative_intent',
  narrative_density_thread_overload: 'narrative_intent',
};

export function isNarrativeStructureIssue(issue: ContinuityIssue): boolean {
  return NARRATIVE_STRUCTURE_TYPES.has(issue.type);
}

/** @deprecated Use isNarrativeStructureIssue */
export function isNarrativeDeadEndIssue(issue: ContinuityIssue): boolean {
  return isNarrativeStructureIssue(issue);
}

export function isNarrativeOrphanIssue(issue: ContinuityIssue): boolean {
  return NARRATIVE_ORPHAN_TYPES.has(issue.type);
}

export function resolveOrphanIsolationClass(
  issue: ContinuityIssue,
): NarrativeIsolationClass | null {
  return ORPHAN_TYPE_TO_ISOLATION[issue.type] ?? null;
}

export function isNarrativeCycleIssue(issue: ContinuityIssue): boolean {
  return NARRATIVE_CYCLE_TYPES.has(issue.type);
}

export function resolveContinuityIssueCategory(
  issue: ContinuityIssue,
): import('@shared/continuityIssue').ContinuityIssueCategory | null {
  if (issue.issueCategory) return issue.issueCategory;
  return TYPE_TO_CATEGORY[issue.type] ?? null;
}

export function groupIssuesByCategory(
  issues: ContinuityIssue[],
): Map<
  import('@shared/continuityIssue').ContinuityIssueCategory,
  ContinuityIssue[]
> {
  const map = new Map<
    import('@shared/continuityIssue').ContinuityIssueCategory,
    ContinuityIssue[]
  >();
  for (const issue of issues) {
    const category = resolveContinuityIssueCategory(issue);
    if (!category) continue;
    const list = map.get(category) ?? [];
    list.push(issue);
    map.set(category, list);
  }
  return map;
}

export function groupOrphanIssuesByIsolation(
  issues: ContinuityIssue[],
): Map<NarrativeIsolationClass, ContinuityIssue[]> {
  const map = new Map<NarrativeIsolationClass, ContinuityIssue[]>();
  for (const issue of issues) {
    if (!isNarrativeOrphanIssue(issue)) continue;
    const isolation = resolveOrphanIsolationClass(issue);
    if (!isolation) continue;
    const list = map.get(isolation) ?? [];
    list.push(issue);
    map.set(isolation, list);
  }
  return map;
}

export const NARRATIVE_CATEGORY_ORDER: import('@shared/continuityIssue').ContinuityIssueCategory[] =
  ['structural', 'system_consistency', 'narrative_intent'];
