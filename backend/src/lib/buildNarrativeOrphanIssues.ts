import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import type { NarrativeOrphanFinding } from '../../../shared/narrativeOrphanAnalysis.js';

function formatMessage(finding: NarrativeOrphanFinding): string {
  const title = finding.title;
  switch (finding.ruleId) {
    case 'entity_graph_isolated':
      return `"${title}" participates nowhere in playable narrative state (no graph, thread, quest, or chronology links).`;
    case 'quest_isolated':
      return `"${title}" is active but isolated from the narrative graph.`;
    case 'thread_unconnected':
      return `"${title}" — open ${finding.messageParts.threadKind ?? 'thread'} has no related pages or graph links.`;
    case 'npc_narratively_disconnected':
      return `"${title}" is not connected to active quests, threads, or events via narrative graph paths.`;
    case 'faction_inactive':
      return `"${title}" — organization has no active narrative participation${finding.messageParts.dissolved === 'true' ? ' (dissolved)' : ''}.`;
    default:
      return `"${title}" — orphaned narrative content (${finding.ruleId}).`;
  }
}

export function buildNarrativeOrphanIssue(
  finding: NarrativeOrphanFinding,
  scope: ContinuityScope,
): ContinuityIssue {
  const fingerprint = continuityFingerprint(finding.issueType, {
    pageId: finding.pageId,
    ruleId: finding.ruleId,
  });
  return {
    id: continuityIssueId(fingerprint),
    fingerprint,
    severity: finding.severity,
    scope,
    type: finding.issueType,
    producer: 'narrative_orphan_analyzer',
    message: formatMessage(finding),
    pageId: finding.pageId,
    issueCategory:
      finding.isolationClass === 'structural'
        ? 'structural'
        : finding.isolationClass === 'temporal'
          ? 'system_consistency'
          : 'narrative_intent',
  };
}

export function buildNarrativeOrphanIssues(
  findings: NarrativeOrphanFinding[],
  scope: ContinuityScope,
): ContinuityIssue[] {
  return findings.map((finding) => buildNarrativeOrphanIssue(finding, scope));
}
