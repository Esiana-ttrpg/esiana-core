/**
 * Layer 4 — priority-aware continuity issue truncation.
 */
import type { ContinuityIssue, ContinuityIssueSeverity } from './continuityIssue.js';

export type TruncationContext = {
  /** Page IDs of ACTIVE quests and OPEN authored threads. */
  activeNarrativePageIds?: ReadonlySet<string>;
  /** Recency by pageId (epoch ms). */
  recencyByPageId?: ReadonlyMap<string, number>;
};

const SEVERITY_RANK: Record<ContinuityIssueSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

const NARRATIVE_ANALYZER_PRODUCERS = new Set([
  'narrative_dead_end_analyzer',
  'narrative_hidden_reachability_analyzer',
  'narrative_circular_dependency_analyzer',
  'narrative_orphan_analyzer',
  'narrative_clue_redundancy_analyzer',
  'narrative_foreshadowing_analyzer',
  'narrative_density_analyzer',
]);

export function rankContinuityIssue(
  issue: ContinuityIssue,
  context: TruncationContext = {},
): number {
  const severity = SEVERITY_RANK[issue.severity] * 1_000_000;
  const narrativeEntity =
    issue.pageId && issue.producer !== 'link_integrity' ? 100_000 : 0;
  const activeParticipation =
    issue.pageId && context.activeNarrativePageIds?.has(issue.pageId) ? 50_000 : 0;
  const recency = issue.pageId
    ? (context.recencyByPageId?.get(issue.pageId) ?? 0)
    : 0;
  return severity + narrativeEntity + activeParticipation + recency / 1_000_000;
}

export function truncateContinuityIssues(
  issues: ContinuityIssue[],
  cap: number,
  context: TruncationContext = {},
): ContinuityIssue[] {
  if (issues.length <= cap) return issues;
  return [...issues]
    .sort((a, b) => rankContinuityIssue(b, context) - rankContinuityIssue(a, context))
    .slice(0, cap);
}

export function truncateNarrativeContinuityIssues(
  issues: ContinuityIssue[],
  cap: number,
  context: TruncationContext = {},
): ContinuityIssue[] {
  const narrative = issues.filter((i) => NARRATIVE_ANALYZER_PRODUCERS.has(i.producer));
  const other = issues.filter((i) => !NARRATIVE_ANALYZER_PRODUCERS.has(i.producer));
  const truncatedNarrative = truncateContinuityIssues(narrative, cap, context);
  return [...other, ...truncatedNarrative];
}

export const GLOBAL_NARRATIVE_CONTINUITY_CAP = 50;
