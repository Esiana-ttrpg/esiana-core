import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSceneTimelineProjection,
  deriveBlockingSceneIds,
  deriveSessionConfidence,
  resolveAnchorSessionId,
  topologicalSceneOrder,
} from './sceneTimelineProjection.js';
import type { SceneTimelineSceneInput, SceneTimelineSession } from './sceneTimelineProjection.js';

function scene(
  id: string,
  overrides: Partial<SceneTimelineSceneInput['scene']> = {},
  title?: string,
): SceneTimelineSceneInput {
  return {
    id,
    title: title ?? id,
    scene: {
      sceneStatus: 'PLANNED',
      beatType: null,
      plannedSessionId: null,
      playedSessionId: null,
      sortOrder: null,
      followsScenePageIds: [],
      linkedQuestPageIds: [],
      ...overrides,
    },
  };
}

const sessions: SceneTimelineSession[] = [
  { id: 's1', title: 'Session 1', sequenceOrder: 0, plannedStartAt: '2026-01-01T00:00:00.000Z' },
  { id: 's2', title: 'Session 2', sequenceOrder: 1, plannedStartAt: null },
  { id: 's3', title: 'Session 3', sequenceOrder: 2, plannedStartAt: null },
  { id: 's4', title: 'Session 4', sequenceOrder: 3, plannedStartAt: null },
  { id: 's5', title: 'Session 5', sequenceOrder: 4, plannedStartAt: null },
  { id: 's6', title: 'Session 6', sequenceOrder: 5, plannedStartAt: null },
];

test('topologicalSceneOrder respects followsScenePageIds', () => {
  const ordered = topologicalSceneOrder([
    scene('b', { followsScenePageIds: ['a'] }),
    scene('a'),
    scene('c', { followsScenePageIds: ['b'] }),
  ]);
  assert.deepEqual(
    ordered.map((entry) => entry.id),
    ['a', 'b', 'c'],
  );
});

test('topologicalSceneOrder appends cycle members deterministically', () => {
  const ordered = topologicalSceneOrder([
    scene('a', { followsScenePageIds: ['b'] }),
    scene('b', { followsScenePageIds: ['a'] }),
    scene('z'),
  ]);
  assert.equal(ordered.length, 3);
  assert.deepEqual(
    ordered.map((entry) => entry.id).sort(),
    ['a', 'b', 'z'],
  );
});

test('deriveBlockingSceneIds flags incomplete predecessors only', () => {
  const scenes = [
    scene('pred-planned', { sceneStatus: 'PLANNED' }),
    scene('pred-ready', { sceneStatus: 'READY' }),
    scene('pred-played', { sceneStatus: 'PLAYED' }),
    scene('child', { followsScenePageIds: ['pred-planned', 'pred-ready', 'pred-played', 'missing'] }),
  ];
  const sceneById = new Map(scenes.map((entry) => [entry.id, entry]));
  const result = deriveBlockingSceneIds(scenes[3]!, sceneById);
  assert.deepEqual(result.blockingSceneIds, ['pred-planned', 'pred-ready']);
});

test('resolveAnchorSessionId advances after last played session', () => {
  const anchor = resolveAnchorSessionId(sessions, [
    scene('played', { sceneStatus: 'PLAYED', plannedSessionId: 's2', playedSessionId: 's2' }),
  ]);
  assert.equal(anchor, 's3');
});

test('deriveSessionConfidence committed for READY on anchor with date', () => {
  const entry = scene('next', { sceneStatus: 'READY', plannedSessionId: 's1' });
  assert.equal(
    deriveSessionConfidence({
      scene: entry,
      plannedSessionId: 's1',
      sessions,
      anchorSessionId: 's1',
    }),
    'committed',
  );
});

test('deriveSessionConfidence tentative when anchor session lacks planned date', () => {
  const entry = scene('next', { sceneStatus: 'READY', plannedSessionId: 's2' });
  assert.equal(
    deriveSessionConfidence({
      scene: entry,
      plannedSessionId: 's2',
      sessions,
      anchorSessionId: 's2',
    }),
    'tentative',
  );
});

test('deriveSessionConfidence distant for far-future assignment', () => {
  const entry = scene('far', { sceneStatus: 'PLANNED', plannedSessionId: 's6' });
  assert.equal(
    deriveSessionConfidence({
      scene: entry,
      plannedSessionId: 's6',
      sessions,
      anchorSessionId: 's1',
    }),
    'distant',
  );
});

test('buildSceneTimelineProjection groups sessions and marks blocked scenes', () => {
  const projection = buildSceneTimelineProjection({
    sessions,
    scenes: [
      scene('blocker', { sceneStatus: 'PLANNED', plannedSessionId: 's1', sortOrder: 10 }),
      scene('blocked', {
        sceneStatus: 'READY',
        plannedSessionId: 's1',
        sortOrder: 20,
        followsScenePageIds: ['blocker'],
      }),
      scene('unscheduled', { sceneStatus: 'PLANNED' }),
    ],
  });

  const sessionColumn = projection.columns.find((column) => column.sessionId === 's1');
  assert.ok(sessionColumn);
  assert.deepEqual(
    sessionColumn!.scenes.map((entry) => entry.id),
    ['blocker', 'blocked'],
  );

  const blockedEntry = sessionColumn!.scenes.find((entry) => entry.id === 'blocked');
  assert.ok(blockedEntry);
  assert.equal(blockedEntry!.isBlocked, true);
  assert.equal(blockedEntry!.sessionConfidence, 'committed');
  assert.deepEqual(blockedEntry!.blockingSceneIds, ['blocker']);

  const unscheduledColumn = projection.columns.find((column) => column.sessionId === null);
  assert.ok(unscheduledColumn);
  assert.equal(unscheduledColumn!.scenes[0]!.id, 'unscheduled');
  assert.equal(unscheduledColumn!.scenes[0]!.sessionConfidence, 'distant');
});
