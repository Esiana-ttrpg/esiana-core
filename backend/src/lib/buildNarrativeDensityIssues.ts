import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import type { DensityThresholdFinding } from '../../../shared/narrativeDensityMetrics.js';

function formatMessage(finding: DensityThresholdFinding): string {
  switch (finding.ruleId) {
    case 'density_high_branching':
      return `Quest branch depth (${finding.messageParts.maxDepth}) exceeds recommended threshold.`;
    case 'density_clue_overload':
      return `Clue density (${finding.messageParts.count} clues per active quest) exceeds recommended threshold.`;
    case 'density_clue_spof':
      return `${finding.messageParts.count} single-point-of-failure clue path(s) detected in active questlines.`;
    case 'density_cluster_complexity':
      return `Cluster "${finding.messageParts.label}" branch depth (${finding.messageParts.maxBranchDepth}) exceeds recommended threshold.`;
    case 'density_thread_overload':
      return `${finding.messageParts.count} open authored threads exceeds recommended threshold.`;
    default:
      return `Narrative density threshold exceeded (${finding.ruleId}).`;
  }
}

export function buildNarrativeDensityIssue(
  finding: DensityThresholdFinding,
  scope: ContinuityScope,
): ContinuityIssue {
  const fingerprint = continuityFingerprint(finding.issueType, {
    subjectPageId: finding.subjectPageId,
    ruleId: finding.ruleId,
    clusterId: finding.clusterId,
  });
  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: finding.severity,
    scope,
    type: finding.issueType,
    producer: 'narrative_density_analyzer',
    message: formatMessage(finding),
    pageId: finding.subjectPageId,
    issueCategory: 'structural',
  };
}

export function buildNarrativeDensityIssues(
  findings: DensityThresholdFinding[],
  scope: ContinuityScope,
): ContinuityIssue[] {
  return findings.map((finding) => buildNarrativeDensityIssue(finding, scope));
}
