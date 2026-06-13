import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ContentRevelationStates,
  type ContentRevelationState,
} from './contentPresence.js';
import {
  EntityGraphEntityTypes,
  EntityRelationKinds,
  type EntityGraphEdge,
} from './entityGraph.js';
import type { NarrativeDeadEndScanRow } from './narrativeDeadEnd.js';
import {
  BranchNodeKinds,
  NARRATIVE_BRANCH_VERSION,
  type NarrativeBranchGraph,
} from './narrativeBranch.js';
import { NARRATIVE_CONSEQUENCE_VERSION } from './narrativeConsequence.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import {
  applyCycleFindingCap,
  calendarCyclesToFindings,
  canonicalizeCycle,
  canonicalCycleParticipants,
  detectBranchCycles,
  detectUnlockCycles,
  extractCalendarPrerequisiteCycles,
  extractUnlockDependencies,
  tarjanStronglyConnectedComponents,
} from './narrativeCircularDependency.js';

function makeBranchGraph(
  overrides: Partial<NarrativeBranchGraph> = {},
): NarrativeBranchGraph {
  return {
    version: NARRATIVE_BRANCH_VERSION,
    nodes: [
      { id: 'a', label: 'A', kind: BranchNodeKinds.OUTCOME },
      { id: 'b', label: 'B', kind: BranchNodeKinds.HIDDEN },
    ],
    edges: [{ from: 'a', to: 'b' }],
    ...overrides,
  };
}

function makeSubject(
  overrides: Partial<NarrativeDeadEndScanRow> = {},
): NarrativeDeadEndScanRow {
  return {
    subjectPageId: 'quest-a',
    subjectTitle: 'Quest A',
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

describe('canonicalizeCycle', () => {
  it('collapses rotations and reverse traversals', () => {
    const expected = canonicalizeCycle(['A', 'B', 'C']);
    assert.equal(canonicalizeCycle(['B', 'C', 'A']), expected);
    assert.equal(canonicalizeCycle(['C', 'A', 'B']), expected);
    assert.equal(canonicalizeCycle(['A', 'C', 'B']), expected);
    assert.equal(expected, 'A>B>C');
  });

  it('removes duplicated closing node', () => {
    assert.equal(canonicalizeCycle(['A', 'B', 'C', 'A']), 'A>B>C');
  });

  it('returns ordered participants from canonical key', () => {
    assert.deepEqual(canonicalCycleParticipants(['B', 'C', 'A']), ['A', 'B', 'C']);
  });
});

describe('tarjanStronglyConnectedComponents', () => {
  it('finds a 3-node SCC', () => {
    const adj = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['C']],
      ['C', ['A']],
    ]);
    const components = tarjanStronglyConnectedComponents(adj);
    const cyclic = components.filter((c) => c.length > 1);
    assert.equal(cyclic.length, 1);
    assert.equal(cyclic[0].length, 3);
  });

  it('ignores size-1 components without self-loop', () => {
    const adj = new Map<string, string[]>([['A', ['B']], ['B', []]]);
    const components = tarjanStronglyConnectedComponents(adj);
    assert.ok(components.every((c) => c.length === 1));
  });
});

describe('detectUnlockCycles', () => {
  it('emits one finding for mutual lifecycle unlock dependency', () => {
    const subjects = [
      makeSubject({
        subjectPageId: 'quest-a',
        subjectTitle: 'Quest A',
        branchGraph: makeBranchGraph({
          nodes: [
            { id: 'start', label: 'Start', kind: BranchNodeKinds.OUTCOME },
          ],
          edges: [
            {
              from: 'start',
              to: 'start',
              condition: {
                type: 'lifecycle',
                subjectId: 'quest-b',
                state: NarrativeLifecycleStates.ACTIVE,
              },
            },
          ],
        }),
      }),
      makeSubject({
        subjectPageId: 'quest-b',
        subjectTitle: 'Quest B',
        branchGraph: makeBranchGraph({
          nodes: [
            { id: 'start', label: 'Start', kind: BranchNodeKinds.OUTCOME },
          ],
          edges: [
            {
              from: 'start',
              to: 'start',
              condition: {
                type: 'lifecycle',
                subjectId: 'quest-a',
                state: NarrativeLifecycleStates.ACTIVE,
              },
            },
          ],
        }),
      }),
    ];

    const narrativeSubjectIds = new Set(['quest-a', 'quest-b']);
    const pagePresenceById = new Map([
      ['quest-a', ContentRevelationStates.REVEALED],
      ['quest-b', ContentRevelationStates.REVEALED],
    ]);

    const findings = detectUnlockCycles({
      subjects,
      narrativeSubjectIds,
      pagePresenceById,
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].issueType, 'narrative_unlock_cycle');
    assert.equal(findings[0].participantIds.length, 2);
    assert.equal(findings[0].severity, 'critical');
  });

  it('uses warning severity when all participants are draft', () => {
    const subjects = [
      makeSubject({
        subjectPageId: 'quest-a',
        presenceState: ContentRevelationStates.DRAFT,
        branchGraph: makeBranchGraph({
          nodes: [{ id: 'n', label: 'N', kind: BranchNodeKinds.OUTCOME }],
          edges: [
            {
              from: 'n',
              to: 'n',
              condition: {
                type: 'lifecycle',
                subjectId: 'quest-b',
                state: NarrativeLifecycleStates.ACTIVE,
              },
            },
          ],
        }),
      }),
      makeSubject({
        subjectPageId: 'quest-b',
        presenceState: ContentRevelationStates.DRAFT,
        branchGraph: makeBranchGraph({
          nodes: [{ id: 'n', label: 'N', kind: BranchNodeKinds.OUTCOME }],
          edges: [
            {
              from: 'n',
              to: 'n',
              condition: {
                type: 'lifecycle',
                subjectId: 'quest-a',
                state: NarrativeLifecycleStates.ACTIVE,
              },
            },
          ],
        }),
      }),
    ];

    const findings = detectUnlockCycles({
      subjects,
      narrativeSubjectIds: new Set(['quest-a', 'quest-b']),
      pagePresenceById: new Map([
        ['quest-a', ContentRevelationStates.DRAFT],
        ['quest-b', ContentRevelationStates.DRAFT],
      ]),
    });

    assert.equal(findings[0]?.severity, 'warning');
  });

  it('summarizes large SCCs', () => {
    const subjects: NarrativeDeadEndScanRow[] = [];
    const narrativeSubjectIds = new Set<string>();
    const pagePresenceById = new Map<string, ContentRevelationState>();

    for (let i = 0; i < 30; i++) {
      const id = `quest-${i}`;
      const nextId = `quest-${(i + 1) % 30}`;
      narrativeSubjectIds.add(id);
      pagePresenceById.set(id, ContentRevelationStates.REVEALED);
      subjects.push(
        makeSubject({
          subjectPageId: id,
          subjectTitle: `Quest ${i}`,
          branchGraph: makeBranchGraph({
            nodes: [{ id: 'n', label: 'N', kind: BranchNodeKinds.OUTCOME }],
            edges: [
              {
                from: 'n',
                to: 'n',
                condition: {
                  type: 'lifecycle',
                  subjectId: nextId,
                  state: NarrativeLifecycleStates.ACTIVE,
                },
              },
            ],
          }),
        }),
      );
    }

    const findings = detectUnlockCycles({
      subjects,
      narrativeSubjectIds,
      pagePresenceById,
      maxParticipants: 25,
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].summarized, true);
    assert.equal(findings[0].participantIds.length, 25);
    assert.equal(findings[0].messageParts.participantCount, '30');
  });
});

describe('detectBranchCycles', () => {
  it('flags within-subject branch SCC', () => {
    const findings = detectBranchCycles({
      subjects: [
        makeSubject({
          branchGraph: makeBranchGraph({
            nodes: [
              { id: 'a', label: 'A', kind: BranchNodeKinds.OUTCOME },
              { id: 'b', label: 'B', kind: BranchNodeKinds.HIDDEN },
              { id: 'c', label: 'C', kind: BranchNodeKinds.MERGE },
            ],
            edges: [
              { from: 'a', to: 'b' },
              { from: 'b', to: 'c' },
              { from: 'c', to: 'a' },
            ],
          }),
        }),
      ],
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].issueType, 'narrative_branch_cycle');
    assert.equal(findings[0].subjectPageId, 'quest-a');
  });
});

describe('extractCalendarPrerequisiteCycles', () => {
  it('canonicalizes calendar prerequisite loops', () => {
    const edges: EntityGraphEdge[] = [
      {
        id: '1',
        source: {
          entityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          entityId: 'evt-a',
        },
        target: {
          entityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          entityId: 'evt-b',
        },
        relationKind: EntityRelationKinds.CALENDAR_PREREQUISITE,
        direction: 'directed',
        startDate: null,
        endDate: null,
        visibility: null,
        payload: null,
        sourceDomain: 'calendar',
        sourceRecordKey: 'a',
        sourcePageId: null,
      },
      {
        id: '2',
        source: {
          entityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          entityId: 'evt-b',
        },
        target: {
          entityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          entityId: 'evt-c',
        },
        relationKind: EntityRelationKinds.CALENDAR_PREREQUISITE,
        direction: 'directed',
        startDate: null,
        endDate: null,
        visibility: null,
        payload: null,
        sourceDomain: 'calendar',
        sourceRecordKey: 'b',
        sourcePageId: null,
      },
      {
        id: '3',
        source: {
          entityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          entityId: 'evt-c',
        },
        target: {
          entityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          entityId: 'evt-a',
        },
        relationKind: EntityRelationKinds.CALENDAR_PREREQUISITE,
        direction: 'directed',
        startDate: null,
        endDate: null,
        visibility: null,
        payload: null,
        sourceDomain: 'calendar',
        sourceRecordKey: 'c',
        sourcePageId: null,
      },
    ];

    const cycles = extractCalendarPrerequisiteCycles(edges);
    assert.equal(cycles.length, 1);
    assert.equal(cycles[0].canonicalKey, 'evt-a>evt-b>evt-c');
  });
});

describe('applyCycleFindingCap', () => {
  it('limits total findings', () => {
    const findings = Array.from({ length: 60 }, (_, i) =>
      calendarCyclesToFindings(
        [{ eventIds: [`evt-${i}`], canonicalKey: `evt-${i}` }],
        new Map(),
      )[0],
    );
    assert.equal(applyCycleFindingCap(findings, 50).length, 50);
  });
});

describe('extractUnlockDependencies', () => {
  it('extracts consequence discover edges for narrative subjects', () => {
    const subjects = [
      makeSubject({
        subjectPageId: 'quest-a',
        consequenceRules: {
          version: NARRATIVE_CONSEQUENCE_VERSION,
          rules: [
            {
              id: 'r1',
              trigger: { type: 'on_lifecycle', lifecycleTarget: NarrativeLifecycleStates.COMPLETED },
              effects: [{ type: 'discover_quest', questPageId: 'quest-b' }],
            },
          ],
        },
      }),
      makeSubject({ subjectPageId: 'quest-b', subjectTitle: 'Quest B' }),
    ];

    const deps = extractUnlockDependencies(subjects, new Set(['quest-a', 'quest-b']));
    assert.ok(deps.some((d) => d.fromId === 'quest-a' && d.toId === 'quest-b'));
  });
});
