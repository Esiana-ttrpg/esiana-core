import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import type { ClueRedundancyFinding } from '../../../shared/narrativeClueRedundancy.js';

function formatMessage(finding: ClueRedundancyFinding): string {
  const title = finding.messageParts.subjectTitle ?? 'Narrative subject';
  switch (finding.ruleId) {
    case 'clue_no_alternative_path':
      return `"${title}" — progression to conclusion depends on a single clue path (no independent alternative).`;
    case 'progression_articulation_point':
      return `"${title}" — branch node "${finding.messageParts.nodeLabel ?? finding.branchNodeId}" is a progression bottleneck (all paths pass through it).`;
    default:
      return `"${title}" — clue path issue (${finding.ruleId}).`;
  }
}

export function buildNarrativeClueRedundancyIssue(
  finding: ClueRedundancyFinding,
  scope: ContinuityScope,
): ContinuityIssue {
  const fingerprint = continuityFingerprint(finding.issueType, {
    subjectPageId: finding.subjectPageId,
    ruleId: finding.ruleId,
    branchNodeId: finding.branchNodeId,
    targetPageId: finding.clueThreadPageId ?? finding.targetPageId,
  });
  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: finding.severity,
    scope,
    type: finding.issueType,
    producer: 'narrative_clue_redundancy_analyzer',
    message: formatMessage(finding),
    pageId: finding.subjectPageId,
    relatedPageId: finding.clueThreadPageId ?? finding.targetPageId,
    issueCategory: finding.issueCategory,
  };
}

export function buildNarrativeClueRedundancyIssues(
  findings: ClueRedundancyFinding[],
  scope: ContinuityScope,
): ContinuityIssue[] {
  return findings.map((finding) => buildNarrativeClueRedundancyIssue(finding, scope));
}
