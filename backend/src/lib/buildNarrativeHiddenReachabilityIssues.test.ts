import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ContentRevelationStates } from '../../../shared/contentPresence.js';
import type { NarrativeDeadEndScanRow } from '../../../shared/narrativeDeadEnd.js';
import {
  BranchNodeKinds,
  NARRATIVE_BRANCH_VERSION,
} from '../../../shared/narrativeBranch.js';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import { detectHiddenReachabilityIssues } from '../../../shared/narrativeHiddenReachability.js';
import { buildNarrativeHiddenReachabilityIssues } from './buildNarrativeHiddenReachabilityIssues.js';

describe('buildNarrativeHiddenReachabilityIssues', () => {
  it('maps findings to continuity issues with producer and category', () => {
    const subject: NarrativeDeadEndScanRow = {
      subjectPageId: 'quest-1',
      subjectTitle: 'Secret Quest',
      subjectKind: 'quest',
      lifecycleState: NarrativeLifecycleStates.ACTIVE,
      presenceState: ContentRevelationStates.REVEALED,
      updatedAt: new Date('2020-01-01'),
      branchGraph: {
        version: NARRATIVE_BRANCH_VERSION,
        nodes: [
          { id: 'start', label: 'Start', kind: BranchNodeKinds.OUTCOME },
          { id: 'vault', label: 'Vault', kind: BranchNodeKinds.HIDDEN },
        ],
        edges: [
          {
            from: 'start',
            to: 'vault',
            condition: { type: 'calendar_event', eventId: 'missing' },
          },
        ],
      },
      activeNodeId: null,
      consequenceRules: null,
      thread: null,
    };

    const findings = detectHiddenReachabilityIssues({
      subjects: [subject],
      conditionIndex: {
        existingPageIds: new Set(['quest-1']),
        lifecycleBySubjectId: new Map(),
        calendarEventIds: new Set(),
        liveGraphEdges: new Set(),
      },
      now: new Date('2026-01-01'),
    });

    const issues = buildNarrativeHiddenReachabilityIssues(findings, 'global');
    assert.ok(issues.length > 0);
    assert.equal(issues[0].producer, 'narrative_hidden_reachability_analyzer');
    assert.equal(issues[0].type, 'narrative_unreachable_hidden');
    assert.equal(issues[0].issueCategory, 'structural');
    assert.match(issues[0].message, /no activation path/);
  });
});
