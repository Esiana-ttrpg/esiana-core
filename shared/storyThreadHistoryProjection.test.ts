import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyThreadMetadata } from './threadMetadata.js';
import type { SceneTimelineSession } from './sceneTimelineProjection.js';
import {
  buildStoryThreadHistoryProjection,
  buildStoryThreadMilestones,
  compareStoryThreadHistoryEntries,
  deriveLastTouchFromMilestones,
  deriveSessionsSinceLastTouch,
  deriveStoryThreadVisualEmphasis,
  resolveThreadHistoryAnchorSessionId,
} from './storyThreadHistoryProjection.js';

const sessions: SceneTimelineSession[] = [
  { id: 's1', title: 'Session 1', sequenceOrder: 0, plannedStartAt: null },
  { id: 's2', title: 'Session 2', sequenceOrder: 1, plannedStartAt: null },
  { id: 's3', title: 'Session 3', sequenceOrder: 2, plannedStartAt: null },
  { id: 's4', title: 'Session 4', sequenceOrder: 3, plannedStartAt: null },
  { id: 's5', title: 'Session 5', sequenceOrder: 4, plannedStartAt: null },
  { id: 's6', title: 'Session 6', sequenceOrder: 5, plannedStartAt: null },
  { id: 's7', title: 'Session 7', sequenceOrder: 6, plannedStartAt: null },
];

test('buildStoryThreadMilestones keeps payoff and resolution separate', () => {
  const thread = {
    ...emptyThreadMetadata(),
    threadKind: 'mystery' as const,
    threadStatus: 'OPEN' as const,
    introducedSessionId: 's1',
    lastAdvancedSessionId: 's2',
    payoffPageId: 'payoff-page',
    resolvedSessionId: null,
  };

  const milestones = buildStoryThreadMilestones({
    thread,
    stage: 'payoff_pending',
    sessions: new Map(sessions.map((session) => [session.id, session])),
    pageTitlesById: new Map([['payoff-page', 'The Revelation']]),
  });

  assert.equal(milestones.length, 4);
  assert.equal(milestones[2]?.kind, 'payoff');
  assert.equal(milestones[2]?.reached, true);
  assert.equal(milestones[3]?.kind, 'resolved');
  assert.equal(milestones[3]?.reached, false);
});

test('deriveLastTouchFromMilestones prefers resolved over reinforced', () => {
  const milestones = buildStoryThreadMilestones({
    thread: {
      ...emptyThreadMetadata(),
      threadKind: 'foreshadowing',
      introducedSessionId: 's1',
      lastAdvancedSessionId: 's3',
      resolvedSessionId: 's5',
    },
    stage: 'resolved',
    sessions: new Map(sessions.map((session) => [session.id, session])),
    pageTitlesById: new Map(),
  });

  const touch = deriveLastTouchFromMilestones(milestones);
  assert.equal(touch.lastTouchMilestoneKind, 'resolved');
  assert.equal(touch.lastTouchSessionId, 's5');
});

test('deriveSessionsSinceLastTouch computes session gap', () => {
  const gap = deriveSessionsSinceLastTouch({
    anchorSessionId: 's7',
    sessions,
    lastTouchSessionSequenceOrder: 1,
  });
  assert.equal(gap, 5);
});

test('deriveStoryThreadVisualEmphasis marks critical unresolved as dominant', () => {
  assert.equal(
    deriveStoryThreadVisualEmphasis({
      stage: 'introduced',
      narrativeWeight: 'critical',
      sessionsSinceLastTouch: 0,
    }),
    'dominant',
  );
  assert.equal(
    deriveStoryThreadVisualEmphasis({
      stage: 'resolved',
      narrativeWeight: 'critical',
      sessionsSinceLastTouch: null,
    }),
    'muted',
  );
  assert.equal(
    deriveStoryThreadVisualEmphasis({
      stage: 'reinforced',
      narrativeWeight: 'major',
      sessionsSinceLastTouch: 4,
    }),
    'dominant',
  );
});

test('resolveThreadHistoryAnchorSessionId advances after last touched session', () => {
  const anchor = resolveThreadHistoryAnchorSessionId(sessions, ['s3', 's5']);
  assert.equal(anchor, 's6');
});

test('buildStoryThreadHistoryProjection filters tracked kinds and sorts by urgency', () => {
  const projection = buildStoryThreadHistoryProjection({
    sessions,
    threads: [
      {
        threadPageId: 'minor-resolved',
        title: 'Minor resolved',
        thread: {
          ...emptyThreadMetadata(),
          threadKind: 'promise',
          threadStatus: 'RESOLVED',
          narrativeWeight: 'minor',
          introducedSessionId: 's1',
          resolvedSessionId: 's2',
        },
      },
      {
        threadPageId: 'critical-open',
        title: 'Critical omen',
        thread: {
          ...emptyThreadMetadata(),
          threadKind: 'foreshadowing',
          threadStatus: 'OPEN',
          narrativeWeight: 'critical',
          introducedSessionId: 's1',
        },
      },
      {
        threadPageId: 'theory',
        title: 'Player theory',
        thread: {
          ...emptyThreadMetadata(),
          threadKind: 'theory',
          playerSubmitted: true,
        },
      },
    ],
    findings: [
      {
        ruleId: 'foreshadowing_introduced_only',
        issueType: 'narrative_foreshadowing_no_reminder',
        severity: 'info',
        threadPageId: 'critical-open',
        title: 'Critical omen',
        stage: 'introduced',
        threadKind: 'foreshadowing',
      },
    ],
  });

  assert.equal(projection.threads.length, 2);
  assert.equal(projection.threads[0]?.threadPageId, 'critical-open');
  assert.equal(projection.threads[0]?.visualEmphasis, 'dominant');
  assert.deepEqual(projection.threads[0]?.diagnosticRuleIds, [
    'foreshadowing_introduced_only',
  ]);
  assert.equal(projection.stageCounts.introduced, 1);
  assert.equal(projection.stageCounts.resolved, 1);
});

test('compareStoryThreadHistoryEntries orders dominant before muted within stage', () => {
  const dominant = {
    threadPageId: 'a',
    title: 'B',
    threadKind: 'mystery' as const,
    narrativeWeight: 'critical' as const,
    stage: 'reinforced' as const,
    milestones: [],
    diagnosticRuleIds: [],
    lastTouchMilestoneKind: null,
    lastTouchSessionId: null,
    lastTouchSessionSequenceOrder: null,
    sessionsSinceLastTouch: null,
    anchorSessionId: null,
    visualEmphasis: 'dominant' as const,
  };
  const muted = {
    ...dominant,
    threadPageId: 'b',
    title: 'A',
    visualEmphasis: 'muted' as const,
    stage: 'reinforced' as const,
  };

  assert.ok(compareStoryThreadHistoryEntries(dominant, muted) < 0);
  assert.ok(compareStoryThreadHistoryEntries(muted, dominant) > 0);
});
