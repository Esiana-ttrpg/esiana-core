import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import type { HiddenReachabilityFinding } from '../../../shared/narrativeHiddenReachability.js';

function formatMessage(finding: HiddenReachabilityFinding): string {
  const title = finding.messageParts.subjectTitle ?? 'Narrative subject';
  switch (finding.ruleId) {
    case 'hidden_no_activation_path':
      return `"${title}" — hidden branch "${finding.messageParts.nodeLabel ?? finding.branchNodeId}" has no activation path.`;
    default:
      return `"${title}" — hidden branch reachability issue (${finding.ruleId}).`;
  }
}

function fingerprintParts(
  finding: HiddenReachabilityFinding,
): Record<string, string | undefined> {
  return {
    subjectPageId: finding.subjectPageId,
    ruleId: finding.ruleId,
    branchNodeId: finding.branchNodeId,
  };
}

export function buildNarrativeHiddenReachabilityIssue(
  finding: HiddenReachabilityFinding,
  scope: ContinuityScope,
): ContinuityIssue {
  const fingerprint = continuityFingerprint(finding.issueType, fingerprintParts(finding));
  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: finding.severity,
    scope,
    type: finding.issueType,
    producer: 'narrative_hidden_reachability_analyzer',
    message: formatMessage(finding),
    pageId: finding.subjectPageId,
    issueCategory: finding.issueCategory,
  };
}

export function buildNarrativeHiddenReachabilityIssues(
  findings: HiddenReachabilityFinding[],
  scope: ContinuityScope,
): ContinuityIssue[] {
  return findings.map((finding) => buildNarrativeHiddenReachabilityIssue(finding, scope));
}
