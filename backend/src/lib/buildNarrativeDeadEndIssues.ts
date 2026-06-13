import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import type { NarrativeDeadEndFinding } from '../../../shared/narrativeDeadEnd.js';

function formatMessage(finding: NarrativeDeadEndFinding): string {
  const title = finding.messageParts.subjectTitle ?? 'Narrative subject';
  switch (finding.ruleId) {
    case 'branch_non_terminal_leaf':
      return `"${title}" — branch node "${finding.messageParts.nodeLabel ?? finding.branchNodeId}" is a dead end (no outgoing path).`;
    case 'branch_unreachable_terminal':
      return `"${title}" — conclusion "${finding.messageParts.nodeLabel ?? finding.branchNodeId}" is unreachable from the entry path.`;
    case 'branch_stale_edge':
      return `"${title}" — branch edge references missing node "${finding.branchNodeId}" (may clear after save).`;
    case 'branch_hard_dangling_edge':
      return `"${title}" — branch edge references missing node "${finding.branchNodeId}".`;
    case 'consequence_missing_page':
      return `"${title}" — consequence rule "${finding.messageParts.consequenceRuleId}" targets missing page.`;
    case 'consequence_missing_branch_node':
      return `"${title}" — consequence rule "${finding.messageParts.consequenceRuleId}" references missing branch node "${finding.branchNodeId}".`;
    case 'consequence_target_draft':
      return `"${title}" — consequence rule "${finding.messageParts.consequenceRuleId}" targets draft page.`;
    case 'thread_unresolved_soft':
      return `"${title}" — ${finding.messageParts.threadKind ?? 'thread'} is open with no payoff linked yet.`;
    case 'thread_incomplete_escalated':
      return `"${title}" — ${finding.messageParts.threadKind ?? 'thread'} is open with no payoff and expects resolution.`;
    case 'quest_no_resolution_path':
      return `"${title}" — active quest has no reachable resolution path in its branch graph.`;
    default:
      return `"${title}" — narrative structure issue (${finding.ruleId}).`;
  }
}

function fingerprintParts(finding: NarrativeDeadEndFinding): Record<string, string | undefined> {
  return {
    subjectPageId: finding.subjectPageId,
    ruleId: finding.ruleId,
    branchNodeId: finding.branchNodeId,
    consequenceRuleId: finding.consequenceRuleId,
    targetPageId: finding.relatedPageId,
  };
}

export function buildNarrativeDeadEndIssue(
  finding: NarrativeDeadEndFinding,
  scope: ContinuityScope,
): ContinuityIssue {
  const fingerprint = continuityFingerprint(finding.issueType, fingerprintParts(finding));
  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: finding.severity,
    scope,
    type: finding.issueType,
    producer: 'narrative_dead_end_analyzer',
    message: formatMessage(finding),
    pageId: finding.subjectPageId,
    relatedPageId: finding.relatedPageId,
    issueCategory: finding.issueCategory,
  };
}

export function buildNarrativeDeadEndIssues(
  findings: NarrativeDeadEndFinding[],
  scope: ContinuityScope,
): ContinuityIssue[] {
  return findings.map((finding) => buildNarrativeDeadEndIssue(finding, scope));
}
