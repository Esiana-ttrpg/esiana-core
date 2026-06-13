/**
 * Codex continuity issue contracts (Layer 4 diagnostics — Phase 1).
 * Single shape for controllers, hooks, panels, and future projections.
 */

export type ContinuityIssueSeverity = 'critical' | 'warning' | 'info';

/** Central vocabulary for issue locality — extend here, not ad hoc in controllers. */
export type ContinuityScope = 'local' | 'global' | 'temporal';
// Phase 2+: 'neighbor' | 'revelation' | 'session' | 'campaign'

/** Which analyzer emitted the issue — debugging, analytics, suppression, selective recompute. */
export type ContinuityProducer =
  | 'link_integrity'
  | 'wikilink_resolver'
  | 'unlinked_entity_scanner'
  | 'alias_collision_scanner'
  | 'chronology_analyzer'
  | 'narrative_dead_end_analyzer'
  | 'narrative_hidden_reachability_analyzer'
  | 'narrative_circular_dependency_analyzer'
  | 'narrative_orphan_analyzer'
  | 'narrative_clue_redundancy_analyzer'
  | 'narrative_foreshadowing_analyzer'
  | 'narrative_density_analyzer'
  | 'dramatic_topology_analyzer';

export type ContinuityIssueCategory =
  | 'structural'
  | 'system_consistency'
  | 'narrative_intent';

export type ContinuityIssueType =
  | 'broken_link'
  | 'unresolved_wikilink'
  | 'unlinked_entity'
  | 'alias_collision'
  | 'temporal_posthumous_reference'
  | 'temporal_dissolved_org_reference'
  | 'narrative_dead_end'
  | 'narrative_unreachable_conclusion'
  | 'narrative_broken_chain'
  | 'narrative_unresolved_thread'
  | 'narrative_incomplete_arc'
  | 'narrative_unreachable_hidden'
  | 'narrative_branch_cycle'
  | 'narrative_unlock_cycle'
  | 'calendar_prerequisite_cycle'
  | 'narrative_orphan_entity'
  | 'narrative_orphan_npc'
  | 'narrative_orphan_faction'
  | 'narrative_orphan_thread'
  | 'narrative_orphan_quest'
  | 'narrative_clue_single_point_of_failure'
  | 'narrative_progression_bottleneck'
  | 'narrative_foreshadowing_no_reminder'
  | 'narrative_foreshadowing_stale'
  | 'narrative_foreshadowing_no_payoff'
  | 'narrative_density_high_branching'
  | 'narrative_density_clue_overload'
  | 'narrative_density_clue_spof'
  | 'narrative_density_cluster_complexity'
  | 'narrative_density_thread_overload'
  | 'narrative_dramatic_topology';

export interface ContinuityIssue {
  id: string;
  fingerprint: string;
  severity: ContinuityIssueSeverity;
  scope: ContinuityScope;
  type: ContinuityIssueType;
  producer: ContinuityProducer;
  message: string;
  pageId?: string;
  relatedPageId?: string;
  linkLabel?: string;
  /** Wiki layout block that originated this issue, when known */
  blockId?: string;
  /** Layer 4 narrative lint grouping — structural / system / intent */
  issueCategory?: ContinuityIssueCategory;
  /** Ordered wiki participants for cycle issues (canonical server order) */
  relatedPageIds?: string[];
}

export type ContinuityIssueCounts = Record<ContinuityIssueSeverity, number>;

export function emptyContinuityIssueCounts(): ContinuityIssueCounts {
  return { critical: 0, warning: 0, info: 0 };
}

export function countContinuityIssues(
  issues: ContinuityIssue[],
): ContinuityIssueCounts {
  const counts = emptyContinuityIssueCounts();
  for (const issue of issues) {
    counts[issue.severity] += 1;
  }
  return counts;
}

export interface PageContinuityPayload {
  pageId: string;
  title: string;
  issues: ContinuityIssue[];
  counts: ContinuityIssueCounts;
}

export interface GlobalContinuityPayload {
  issues: ContinuityIssue[];
  counts: ContinuityIssueCounts;
  openUnresolvedCount: number;
  /** Layer 4 — foreshadowing progression chains (Layer 5 consumption). */
  foreshadowingChains?: import('./narrativeForeshadowingTracker.js').ForeshadowingChainEntry[];
  /** Layer 4 — authored vs world-state density metrics. */
  narrativeDensity?: import('./narrativeDensityMetrics.js').NarrativeDensityMetrics;
}

const FINGERPRINT_PART_ORDER: Record<ContinuityIssueType, string[]> = {
  broken_link: ['pageId', 'targetPageId', 'slug'],
  unresolved_wikilink: ['sourcePageId', 'normalizedText'],
  unlinked_entity: ['pageId'],
  alias_collision: ['normalizedAlias'],
  temporal_posthumous_reference: [
    'sourcePageId',
    'targetPageId',
    'contentDateKey',
    'boundaryDateKey',
  ],
  temporal_dissolved_org_reference: [
    'sourcePageId',
    'targetPageId',
    'contentDateKey',
    'boundaryDateKey',
  ],
  narrative_dead_end: ['subjectPageId', 'ruleId', 'branchNodeId'],
  narrative_unreachable_conclusion: ['subjectPageId', 'ruleId', 'branchNodeId'],
  narrative_broken_chain: [
    'subjectPageId',
    'ruleId',
    'consequenceRuleId',
    'targetPageId',
    'branchNodeId',
  ],
  narrative_unresolved_thread: ['subjectPageId', 'ruleId'],
  narrative_incomplete_arc: ['subjectPageId', 'ruleId'],
  narrative_unreachable_hidden: ['subjectPageId', 'ruleId', 'branchNodeId'],
  narrative_branch_cycle: ['subjectPageId', 'ruleId', 'canonicalCycleKey'],
  narrative_unlock_cycle: ['ruleId', 'canonicalCycleKey'],
  calendar_prerequisite_cycle: ['ruleId', 'canonicalCycleKey'],
  narrative_orphan_entity: ['pageId', 'ruleId'],
  narrative_orphan_npc: ['pageId', 'ruleId'],
  narrative_orphan_faction: ['pageId', 'ruleId'],
  narrative_orphan_thread: ['pageId', 'ruleId'],
  narrative_orphan_quest: ['pageId', 'ruleId'],
  narrative_clue_single_point_of_failure: ['subjectPageId', 'ruleId', 'targetPageId'],
  narrative_progression_bottleneck: ['subjectPageId', 'ruleId', 'branchNodeId'],
  narrative_foreshadowing_no_reminder: ['subjectPageId', 'ruleId'],
  narrative_foreshadowing_stale: ['subjectPageId', 'ruleId'],
  narrative_foreshadowing_no_payoff: ['subjectPageId', 'ruleId'],
  narrative_density_high_branching: ['subjectPageId', 'ruleId'],
  narrative_density_clue_overload: ['ruleId'],
  narrative_density_clue_spof: ['subjectPageId', 'ruleId'],
  narrative_density_cluster_complexity: ['ruleId', 'clusterId'],
  narrative_density_thread_overload: ['ruleId'],
  narrative_dramatic_topology: ['pageId', 'kind', 'sceneIds'],
};

/** Stable keys for dismissals, dedup, caching, and future event sourcing. */
export function continuityFingerprint(
  type: ContinuityIssueType,
  parts: Record<string, string | undefined>,
): string {
  const keys = FINGERPRINT_PART_ORDER[type];
  const segments = keys.map((key) => {
    const value = parts[key]?.trim();
    return value ? value : '';
  });
  return `${type}:${segments.join(':')}`;
}

export function continuityIssueId(fingerprint: string): string {
  return fingerprint;
}
