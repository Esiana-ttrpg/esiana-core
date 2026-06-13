import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ContentRevelationStates } from './contentPresence.js';
import type { NarrativeDeadEndScanRow } from './narrativeDeadEnd.js';
import {
  BranchNodeKinds,
  NARRATIVE_BRANCH_VERSION,
  type NarrativeBranchGraph,
} from './narrativeBranch.js';
import { EntityRelationKinds } from './entityGraph.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import {
  detectHiddenReachabilityIssues,
  isBranchConditionSatisfiable,
  type ActivationConditionIndex,
} from './narrativeHiddenReachability.js';
import { liveGraphEdgeKey } from './narrativeBranchAnalysis.js';

function makeBranchGraph(
  overrides: Partial<NarrativeBranchGraph> = {},
): NarrativeBranchGraph {
  return {
    version: NARRATIVE_BRANCH_VERSION,
    nodes: [
      { id: 'start', label: 'Start', kind: BranchNodeKinds.OUTCOME },
      { id: 'secret', label: 'Secret', kind: BranchNodeKinds.HIDDEN },
    ],
    edges: [{ from: 'start', to: 'secret' }],
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

function makeIndex(
  overrides: Partial<ActivationConditionIndex> = {},
): ActivationConditionIndex {
  return {
    existingPageIds: new Set(['quest-1', 'npc-1', 'loc-1']),
    lifecycleBySubjectId: new Map([
      ['quest-1', NarrativeLifecycleStates.ACTIVE],
      ['npc-1', NarrativeLifecycleStates.DISCOVERED],
    ]),
    calendarEventIds: new Set(['event-1']),
    liveGraphEdges: new Set([
      liveGraphEdgeKey('npc-1', 'loc-1', EntityRelationKinds.QUEST_GIVER),
    ]),
    ...overrides,
  };
}

const baseInput = {
  subjects: [] as NarrativeDeadEndScanRow[],
  conditionIndex: makeIndex(),
  now: new Date('2026-01-01'),
};

describe('isBranchConditionSatisfiable', () => {
  it('treats absent and manual_flag as satisfiable', () => {
    const index = makeIndex();
    assert.equal(isBranchConditionSatisfiable(undefined, index), true);
    assert.equal(
      isBranchConditionSatisfiable({ type: 'manual_flag', key: 'found_key', value: true }, index),
      true,
    );
  });

  it('checks lifecycle reachability', () => {
    const index = makeIndex();
    assert.equal(
      isBranchConditionSatisfiable(
        { type: 'lifecycle', subjectId: 'npc-1', state: NarrativeLifecycleStates.ACTIVE },
        index,
      ),
      true,
    );
    assert.equal(
      isBranchConditionSatisfiable(
        {
          type: 'lifecycle',
          subjectId: 'npc-1',
          state: NarrativeLifecycleStates.COMPLETED,
        },
        makeIndex({
          lifecycleBySubjectId: new Map([
            ['npc-1', NarrativeLifecycleStates.FAILED],
          ]),
        }),
      ),
      false,
    );
    assert.equal(
      isBranchConditionSatisfiable(
        { type: 'lifecycle', subjectId: 'missing', state: NarrativeLifecycleStates.ACTIVE },
        index,
      ),
      false,
    );
  });

  it('checks calendar_event and live graph_edge', () => {
    const index = makeIndex();
    assert.equal(
      isBranchConditionSatisfiable({ type: 'calendar_event', eventId: 'event-1' }, index),
      true,
    );
    assert.equal(
      isBranchConditionSatisfiable({ type: 'calendar_event', eventId: 'missing' }, index),
      false,
    );
    assert.equal(
      isBranchConditionSatisfiable(
        {
          type: 'graph_edge',
          sourcePageId: 'npc-1',
          targetPageId: 'loc-1',
          kind: EntityRelationKinds.QUEST_GIVER,
        },
        index,
      ),
      true,
    );
    assert.equal(
      isBranchConditionSatisfiable(
        {
          type: 'graph_edge',
          sourcePageId: 'npc-1',
          targetPageId: 'loc-1',
          kind: EntityRelationKinds.WIKI_REFERENCE,
        },
        index,
      ),
      false,
    );
  });
});

describe('detectHiddenReachabilityIssues', () => {
  it('does not flag HIDDEN behind unconditional OUTCOME edge', () => {
    const findings = detectHiddenReachabilityIssues({
      ...baseInput,
      subjects: [makeSubject({ branchGraph: makeBranchGraph() })],
    });
    assert.equal(findings.length, 0);
  });

  it('flags HIDDEN behind unsatisfiable graph_edge condition', () => {
    const graph = makeBranchGraph({
      edges: [
        {
          from: 'start',
          to: 'secret',
          condition: {
            type: 'graph_edge',
            sourcePageId: 'npc-1',
            targetPageId: 'loc-1',
            kind: EntityRelationKinds.WIKI_REFERENCE,
          },
        },
      ],
    });
    const findings = detectHiddenReachabilityIssues({
      ...baseInput,
      subjects: [makeSubject({ branchGraph: graph })],
    });
    assert.ok(findings.some((f) => f.ruleId === 'hidden_no_activation_path'));
  });

  it('exempts HIDDEN listed in entryNodeIds', () => {
    const graph = makeBranchGraph({
      nodes: [{ id: 'secret', label: 'Secret', kind: BranchNodeKinds.HIDDEN }],
      edges: [],
      entryNodeIds: ['secret'],
    });
    const findings = detectHiddenReachabilityIssues({
      ...baseInput,
      subjects: [makeSubject({ branchGraph: graph })],
    });
    assert.equal(findings.length, 0);
  });

  it('allows HIDDEN via satisfiable lifecycle condition', () => {
    const graph = makeBranchGraph({
      edges: [
        {
          from: 'start',
          to: 'secret',
          condition: {
            type: 'lifecycle',
            subjectId: 'npc-1',
            state: NarrativeLifecycleStates.ACTIVE,
          },
        },
      ],
    });
    const findings = detectHiddenReachabilityIssues({
      ...baseInput,
      subjects: [makeSubject({ branchGraph: graph })],
    });
    assert.equal(findings.length, 0);
  });

  it('skips draft subjects', () => {
    const findings = detectHiddenReachabilityIssues({
      ...baseInput,
      subjects: [
        makeSubject({
          presenceState: ContentRevelationStates.DRAFT,
          branchGraph: makeBranchGraph({
            nodes: [{ id: 'secret', label: 'Secret', kind: BranchNodeKinds.HIDDEN }],
            edges: [],
          }),
        }),
      ],
    });
    assert.equal(findings.length, 0);
  });

  it('downgrades severity for recently edited subjects', () => {
    const graph = makeBranchGraph({
      nodes: [
        { id: 'start', label: 'Start', kind: BranchNodeKinds.OUTCOME },
        { id: 'secret', label: 'Secret', kind: BranchNodeKinds.HIDDEN },
      ],
      edges: [
        {
          from: 'start',
          to: 'secret',
          condition: { type: 'calendar_event', eventId: 'missing' },
        },
      ],
    });
    const findings = detectHiddenReachabilityIssues({
      ...baseInput,
      subjects: [
        makeSubject({
          branchGraph: graph,
          updatedAt: new Date('2026-01-01T00:04:00Z'),
        }),
      ],
      now: new Date('2026-01-01T00:05:00Z'),
    });
    const issue = findings.find((f) => f.ruleId === 'hidden_no_activation_path');
    assert.ok(issue);
    assert.equal(issue.severity, 'info');
  });
});
