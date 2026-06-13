/**
 * Layer 5 — narrative pressure feed (continuity → operational intelligence).
 */
import type { ContinuityIssue, ContinuityIssueSeverity } from './continuityIssue.js';

export type NarrativePressureCategory =
  | 'structural'
  | 'investigative'
  | 'emotional'
  | 'temporal';

export interface NarrativePressureItem {
  id: string;
  severity: ContinuityIssueSeverity;
  category: NarrativePressureCategory;
  message: string;
  linkedEntityIds: string[];
  weightMultiplier: number;
  sourceProducer: string;
  sourceIssueType: string;
}

const PRODUCER_CATEGORY: Record<string, NarrativePressureCategory> = {
  narrative_clue_redundancy_analyzer: 'investigative',
  narrative_hidden_reachability_analyzer: 'investigative',
  narrative_orphan_analyzer: 'structural',
  narrative_dead_end_analyzer: 'structural',
  narrative_circular_dependency_analyzer: 'structural',
  narrative_foreshadowing_analyzer: 'emotional',
  narrative_density_analyzer: 'structural',
  dramatic_topology_analyzer: 'emotional',
  chronology_analyzer: 'temporal',
};

const SEVERITY_RANK: Record<ContinuityIssueSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

export function mapContinuityIssueToPressure(
  issue: ContinuityIssue,
  weightByEntityId?: Map<string, number>,
): NarrativePressureItem {
  const linkedEntityIds = [
    ...(issue.pageId ? [issue.pageId] : []),
    ...(issue.relatedPageId ? [issue.relatedPageId] : []),
    ...(issue.relatedPageIds ?? []),
  ].filter((id, index, arr) => arr.indexOf(id) === index);

  let weightMultiplier = 1;
  if (weightByEntityId && linkedEntityIds.length > 0) {
    const maxWeight = Math.max(
      ...linkedEntityIds.map((id) => weightByEntityId.get(id) ?? 1),
    );
    weightMultiplier = maxWeight;
  }

  const category =
    PRODUCER_CATEGORY[issue.producer] ??
    (issue.issueCategory === 'narrative_intent' ? 'emotional' : 'structural');

  return {
    id: issue.fingerprint,
    severity: issue.severity,
    category,
    message: issue.message,
    linkedEntityIds,
    weightMultiplier,
    sourceProducer: issue.producer,
    sourceIssueType: issue.type,
  };
}

export function buildNarrativePressureFeed(
  issues: ContinuityIssue[],
  weightByEntityId?: Map<string, number>,
): NarrativePressureItem[] {
  return issues
    .map((issue) => mapContinuityIssueToPressure(issue, weightByEntityId))
    .sort((a, b) => {
      const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.weightMultiplier - a.weightMultiplier;
    });
}

export function narrativeWeightToScore(weight: string | undefined | null): number {
  switch (weight) {
    case 'critical':
      return 3;
    case 'major':
      return 2;
    case 'minor':
      return 1;
    default:
      return 2;
  }
}
