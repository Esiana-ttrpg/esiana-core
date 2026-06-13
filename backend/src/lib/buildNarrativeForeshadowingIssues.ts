import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import type { ForeshadowingTrackerFinding } from '../../../shared/narrativeForeshadowingTracker.js';

function formatMessage(finding: ForeshadowingTrackerFinding): string {
  const title = finding.title;
  switch (finding.ruleId) {
    case 'foreshadowing_introduced_only':
      return `"${title}" — ${finding.threadKind} introduced but not reinforced in a later session yet.`;
    case 'foreshadowing_stale_reinforcement':
      return `"${title}" — ${finding.threadKind} was reinforced but has no payoff linked (stale).`;
    case 'foreshadowing_payoff_pending':
      return `"${title}" — ${finding.threadKind} reinforced with no payoff page linked.`;
    default:
      return `"${title}" — foreshadowing progression issue (${finding.ruleId}).`;
  }
}

export function buildNarrativeForeshadowingIssue(
  finding: ForeshadowingTrackerFinding,
  scope: ContinuityScope,
): ContinuityIssue {
  const fingerprint = continuityFingerprint(finding.issueType, {
    subjectPageId: finding.threadPageId,
    ruleId: finding.ruleId,
  });
  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: finding.severity,
    scope,
    type: finding.issueType,
    producer: 'narrative_foreshadowing_analyzer',
    message: formatMessage(finding),
    pageId: finding.threadPageId,
    issueCategory: 'narrative_intent',
  };
}

export function buildNarrativeForeshadowingIssues(
  findings: ForeshadowingTrackerFinding[],
  scope: ContinuityScope,
): ContinuityIssue[] {
  return findings.map((finding) => buildNarrativeForeshadowingIssue(finding, scope));
}
