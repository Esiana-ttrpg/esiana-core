import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ContentRevelationStates } from '../../../shared/contentPresence.js';
import {
  detectNarrativeDeadEnds,
  type NarrativeDeadEndScanRow,
} from '../../../shared/narrativeDeadEnd.js';
import {
  BranchNodeKinds,
  NARRATIVE_BRANCH_VERSION,
  type NarrativeBranchGraph,
} from '../../../shared/narrativeBranch.js';
import {
  NARRATIVE_CONSEQUENCE_VERSION,
  type ConsequenceRuleSet,
} from '../../../shared/narrativeConsequence.js';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import { parseThreadMetadata } from './threadMetadata.js';
import { buildNarrativeDeadEndIssues } from './buildNarrativeDeadEndIssues.js';

function makeBranchGraph(
  overrides: Partial<NarrativeBranchGraph> = {},
): NarrativeBranchGraph {
  return {
    version: NARRATIVE_BRANCH_VERSION,
    nodes: [
      { id: 'start', label: 'Start', kind: BranchNodeKinds.OUTCOME },
      { id: 'end', label: 'End', kind: BranchNodeKinds.MERGE },
    ],
    edges: [{ from: 'start', to: 'end' }],
    ...overrides,
  };
}

function makeSubject(
  overrides: Partial<NarrativeDeadEndScanRow> = {},
): NarrativeDeadEndScanRow {
  return {
    subjectPageId: 'quest-1',
    subjectTitle: 'Test Quest',
    subjectKind: 'quest',
    lifecycleState: NarrativeLifecycleStates.ACTIVE,
    presenceState: ContentRevelationStates.REVEALED,
    updatedAt: new Date('2020-01-01'),
    branchGraph: null,
    activeNodeId: null,
    consequenceRules: null,
    thread: null,
    ...overrides,
  };
}

const baseInput = {
  subjects: [] as NarrativeDeadEndScanRow[],
  existingPageIds: new Set(['quest-1', 'page-target']),
  pagePresenceById: new Map([
    ['quest-1', ContentRevelationStates.REVEALED],
    ['page-target', ContentRevelationStates.REVEALED],
  ]),
  consequenceReferenceIndex: new Set<string>(),
  now: new Date('2026-01-01'),
};

describe('detectNarrativeDeadEnds', () => {
  it('flags non-terminal leaf nodes', () => {
    const graph = makeBranchGraph({
      nodes: [
        { id: 'start', label: 'Start', kind: BranchNodeKinds.OUTCOME },
        { id: 'hidden', label: 'Hidden', kind: BranchNodeKinds.HIDDEN },
      ],
      edges: [{ from: 'start', to: 'hidden' }],
    });
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [makeSubject({ branchGraph: graph })],
    });
    assert.ok(
      findings.some((f) => f.ruleId === 'branch_non_terminal_leaf' && f.branchNodeId === 'hidden'),
    );
  });

  it('anchors reachability to explicit entryNodeIds', () => {
    const graph = makeBranchGraph({
      nodes: [
        { id: 'a', label: 'A', kind: BranchNodeKinds.OUTCOME },
        { id: 'b', label: 'B', kind: BranchNodeKinds.OUTCOME },
        { id: 'end-a', label: 'End A', kind: BranchNodeKinds.MERGE },
        { id: 'end-b', label: 'End B', kind: BranchNodeKinds.MERGE },
      ],
      edges: [
        { from: 'a', to: 'end-a' },
        { from: 'b', to: 'end-b' },
      ],
      entryNodeIds: ['a'],
    });
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [makeSubject({ branchGraph: graph })],
    });
    assert.ok(
      findings.some(
        (f) =>
          f.ruleId === 'branch_unreachable_terminal' && f.branchNodeId === 'end-b',
      ),
    );
    assert.ok(
      !findings.some(
        (f) =>
          f.ruleId === 'branch_unreachable_terminal' && f.branchNodeId === 'end-a',
      ),
    );
  });

  it('emits soft unresolved thread for foreshadowing without payoff', () => {
    const thread = parseThreadMetadata({
      threadKind: 'foreshadowing',
      threadStatus: 'OPEN',
      narrativeWeight: 'minor',
    });
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [
        makeSubject({
          subjectPageId: 'thread-1',
          subjectKind: 'open_thread',
          thread,
          lifecycleState: NarrativeLifecycleStates.ACTIVE,
        }),
      ],
    });
    assert.ok(findings.some((f) => f.ruleId === 'thread_unresolved_soft'));
    assert.equal(
      findings.find((f) => f.ruleId === 'thread_unresolved_soft')?.severity,
      'info',
    );
  });

  it('escalates promise threads without payoff', () => {
    const thread = parseThreadMetadata({
      threadKind: 'promise',
      threadStatus: 'OPEN',
      narrativeWeight: 'major',
    });
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [
        makeSubject({
          subjectPageId: 'thread-1',
          subjectKind: 'open_thread',
          thread,
          lifecycleState: NarrativeLifecycleStates.ACTIVE,
        }),
      ],
    });
    assert.ok(findings.some((f) => f.ruleId === 'thread_incomplete_escalated'));
  });

  it('downgrades missing consequence target on draft subject', () => {
    const rules: ConsequenceRuleSet = {
      version: NARRATIVE_CONSEQUENCE_VERSION,
      rules: [
        {
          id: 'rule-1',
          trigger: {
            type: 'on_lifecycle',
            lifecycleTarget: NarrativeLifecycleStates.COMPLETED,
          },
          effects: [{ type: 'discover_wiki_page', pageId: 'missing-page' }],
        },
      ],
    };
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [
        makeSubject({
          presenceState: ContentRevelationStates.DRAFT,
          consequenceRules: rules,
        }),
      ],
    });
    const issue = findings.find((f) => f.ruleId === 'consequence_missing_page');
    assert.ok(issue);
    assert.equal(issue.severity, 'warning');
  });

  it('flags critical missing consequence target on published subject', () => {
    const rules: ConsequenceRuleSet = {
      version: NARRATIVE_CONSEQUENCE_VERSION,
      rules: [
        {
          id: 'rule-1',
          trigger: {
            type: 'on_lifecycle',
            lifecycleTarget: NarrativeLifecycleStates.COMPLETED,
          },
          effects: [{ type: 'discover_wiki_page', pageId: 'missing-page' }],
        },
      ],
    };
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [makeSubject({ consequenceRules: rules })],
    });
    const issue = findings.find((f) => f.ruleId === 'consequence_missing_page');
    assert.ok(issue);
    assert.equal(issue.severity, 'critical');
  });

  it('skips quest_no_resolution_path when lifecycle hook exists', () => {
    const graph = makeBranchGraph({
      nodes: [{ id: 'start', label: 'Start', kind: BranchNodeKinds.HIDDEN }],
      edges: [],
    });
    const rules: ConsequenceRuleSet = {
      version: NARRATIVE_CONSEQUENCE_VERSION,
      rules: [
        {
          id: 'resolve',
          trigger: {
            type: 'on_lifecycle',
            lifecycleTarget: NarrativeLifecycleStates.COMPLETED,
          },
          effects: [{ type: 'discover_wiki_page', pageId: 'page-target' }],
        },
      ],
    };
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [
        makeSubject({
          branchGraph: graph,
          consequenceRules: rules,
        }),
      ],
    });
    assert.ok(!findings.some((f) => f.ruleId === 'quest_no_resolution_path'));
  });

  it('emits stale edge info for recently edited subject', () => {
    const graph = makeBranchGraph({
      nodes: [{ id: 'start', label: 'Start', kind: BranchNodeKinds.OUTCOME }],
      edges: [{ from: 'start', to: 'ghost' }],
    });
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [
        makeSubject({
          branchGraph: graph,
          updatedAt: new Date('2026-01-01T00:04:00Z'),
        }),
      ],
      now: new Date('2026-01-01T00:05:00Z'),
    });
    const stale = findings.find((f) => f.ruleId === 'branch_stale_edge');
    assert.ok(stale);
    assert.equal(stale.severity, 'info');
  });
});

describe('buildNarrativeDeadEndIssues', () => {
  it('maps findings to continuity issues with producer and category', () => {
    const findings = detectNarrativeDeadEnds({
      ...baseInput,
      subjects: [
        makeSubject({
          subjectPageId: 'thread-1',
          subjectKind: 'open_thread',
          thread: parseThreadMetadata({
            threadKind: 'promise',
            threadStatus: 'OPEN',
          }),
          lifecycleState: NarrativeLifecycleStates.ACTIVE,
        }),
      ],
    });
    const issues = buildNarrativeDeadEndIssues(findings, 'global');
    assert.ok(issues.length > 0);
    assert.equal(issues[0].producer, 'narrative_dead_end_analyzer');
    assert.ok(issues[0].issueCategory);
    assert.equal(issues[0].pageId, 'thread-1');
  });
});
