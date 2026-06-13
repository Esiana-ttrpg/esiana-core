import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import type { NarrativeCircularDependencyFinding } from '../../../shared/narrativeCircularDependency.js';
import { wikiParticipantIds } from '../../../shared/narrativeCircularDependency.js';

function formatParticipantChain(finding: NarrativeCircularDependencyFinding): string {
  const labels = finding.participantLabels ?? {};
  return finding.participantIds
    .map((id) => labels[id] ?? id)
    .join(' → ');
}

function formatMessage(finding: NarrativeCircularDependencyFinding): string {
  switch (finding.ruleId) {
    case 'branch_cycle_scc': {
      const title = finding.messageParts.subjectTitle ?? 'Narrative subject';
      const chain = formatParticipantChain(finding);
      return `"${title}" — branch nodes form a cycle (${chain}).`;
    }
    case 'unlock_cycle_scc': {
      const count = finding.messageParts.participantCount ?? String(finding.participantIds.length);
      const chain = formatParticipantChain(finding);
      return `${count} subjects form a circular unlock dependency (${chain}).`;
    }
    case 'unlock_cycle_large_scc': {
      const count = finding.messageParts.participantCount ?? String(finding.participantIds.length);
      return `${count} subjects form a circular unlock dependency (showing first ${finding.participantIds.length}).`;
    }
    case 'calendar_prerequisite_scc': {
      const count = finding.messageParts.participantCount ?? String(finding.participantIds.length);
      const chain = formatParticipantChain(finding);
      return `${count} calendar events form a prerequisite cycle (${chain}).`;
    }
    case 'calendar_prerequisite_large_scc': {
      const count = finding.messageParts.participantCount ?? String(finding.participantIds.length);
      return `${count} calendar events form a prerequisite cycle (showing first ${finding.participantIds.length}).`;
    }
    default:
      return `Circular dependency detected (${finding.ruleId}).`;
  }
}

function fingerprintParts(
  finding: NarrativeCircularDependencyFinding,
): Record<string, string | undefined> {
  return {
    subjectPageId: finding.subjectPageId,
    ruleId: finding.ruleId,
    canonicalCycleKey: finding.messageParts.canonicalCycleKey,
  };
}

export function buildNarrativeCircularDependencyIssue(
  finding: NarrativeCircularDependencyFinding,
  scope: ContinuityScope,
): ContinuityIssue {
  const fingerprint = continuityFingerprint(finding.issueType, fingerprintParts(finding));
  const wikiIds =
    finding.issueType === 'narrative_branch_cycle' && finding.subjectPageId
      ? [finding.subjectPageId]
      : wikiParticipantIds(finding);
  const pageId = finding.subjectPageId ?? wikiIds[0];

  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: finding.severity,
    scope,
    type: finding.issueType,
    producer: 'narrative_circular_dependency_analyzer',
    message: formatMessage(finding),
    pageId,
    relatedPageId: wikiIds[1],
    relatedPageIds: wikiIds.length > 0 ? wikiIds : undefined,
    issueCategory: finding.issueCategory,
  };
}

export function buildNarrativeCircularDependencyIssues(
  findings: NarrativeCircularDependencyFinding[],
  scope: ContinuityScope,
): ContinuityIssue[] {
  return findings.map((finding) => buildNarrativeCircularDependencyIssue(finding, scope));
}
