/**
 * Layer 4 — foreshadowing progression state machine (pure).
 */
import type {
  ContinuityIssueSeverity,
  ContinuityIssueType,
} from './continuityIssue.js';
import type { ThreadKind, ThreadMetadataFields } from './threadMetadata.js';

export type ForeshadowingStage =
  | 'introduced'
  | 'reinforced'
  | 'payoff_pending'
  | 'resolved'
  | 'abandoned';

export type ForeshadowingChainEntry = {
  threadPageId: string;
  threadKind: ThreadKind;
  stage: ForeshadowingStage;
  introducedSessionId: string | null;
  lastAdvancedSessionId: string | null;
  payoffPageId: string | null;
  resolvedSessionId: string | null;
};

export type ForeshadowingThreadRow = {
  threadPageId: string;
  title: string;
  thread: ThreadMetadataFields;
  updatedAtMs?: number;
};

export type ForeshadowingTrackerFinding = {
  ruleId: string;
  issueType: ContinuityIssueType;
  severity: ContinuityIssueSeverity;
  threadPageId: string;
  title: string;
  stage: ForeshadowingStage;
  threadKind: ThreadKind;
};

export const FORESHADOWING_STALE_MS = 60 * 24 * 60 * 60 * 1000;

const TRACKED_KINDS = new Set<ThreadKind>(['foreshadowing', 'promise', 'mystery']);

export function deriveForeshadowingStage(
  thread: ThreadMetadataFields,
): ForeshadowingStage {
  if (thread.threadStatus === 'ABANDONED') return 'abandoned';
  if (thread.threadStatus === 'RESOLVED' || thread.resolvedSessionId) {
    return 'resolved';
  }
  if (thread.payoffPageId && thread.threadStatus === 'OPEN') {
    return 'payoff_pending';
  }
  const reinforced =
    thread.lastAdvancedSessionId &&
    thread.introducedSessionId &&
    thread.lastAdvancedSessionId !== thread.introducedSessionId;
  if (reinforced) return 'reinforced';
  if (thread.introducedSessionId) return 'introduced';
  return 'introduced';
}

export function buildForeshadowingChainEntry(
  row: ForeshadowingThreadRow,
): ForeshadowingChainEntry {
  return {
    threadPageId: row.threadPageId,
    threadKind: row.thread.threadKind,
    stage: deriveForeshadowingStage(row.thread),
    introducedSessionId: row.thread.introducedSessionId,
    lastAdvancedSessionId: row.thread.lastAdvancedSessionId,
    payoffPageId: row.thread.payoffPageId,
    resolvedSessionId: row.thread.resolvedSessionId,
  };
}

export function detectForeshadowingIssues(input: {
  threads: readonly ForeshadowingThreadRow[];
  now?: Date;
  staleMs?: number;
}): ForeshadowingTrackerFinding[] {
  const now = input.now ?? new Date();
  const staleMs = input.staleMs ?? FORESHADOWING_STALE_MS;
  const findings: ForeshadowingTrackerFinding[] = [];

  for (const row of input.threads) {
    const { thread } = row;
    if (thread.playerSubmitted || thread.threadKind === 'theory') continue;
    if (!TRACKED_KINDS.has(thread.threadKind)) continue;
    if (thread.threadStatus !== 'OPEN' && thread.threadStatus !== 'DORMANT') continue;

    const stage = deriveForeshadowingStage(thread);

    if (stage === 'introduced') {
      findings.push({
        ruleId: 'foreshadowing_introduced_only',
        issueType: 'narrative_foreshadowing_no_reminder',
        severity: 'info',
        threadPageId: row.threadPageId,
        title: row.title,
        stage,
        threadKind: thread.threadKind,
      });
      continue;
    }

    if (stage === 'reinforced' && !thread.payoffPageId) {
      const stale =
        row.updatedAtMs !== undefined &&
        now.getTime() - row.updatedAtMs > staleMs;
      if (stale) {
        findings.push({
          ruleId: 'foreshadowing_stale_reinforcement',
          issueType: 'narrative_foreshadowing_stale',
          severity: 'warning',
          threadPageId: row.threadPageId,
          title: row.title,
          stage,
          threadKind: thread.threadKind,
        });
      } else {
        findings.push({
          ruleId: 'foreshadowing_payoff_pending',
          issueType: 'narrative_foreshadowing_no_payoff',
          severity:
            thread.narrativeWeight === 'critical' ? 'critical' : 'warning',
          threadPageId: row.threadPageId,
          title: row.title,
          stage,
          threadKind: thread.threadKind,
        });
      }
    }
  }

  return findings;
}
