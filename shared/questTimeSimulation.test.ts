import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildQuestExpiryDismissKey,
  detectQuestTimeSignals,
  emptyQuestTimePayload,
  mergeQuestTimeRules,
  mergeQuestTimeState,
  type QuestTimeSimulationRow,
} from './questTimeSimulation.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';

function row(overrides: Partial<QuestTimeSimulationRow> = {}): QuestTimeSimulationRow {
  const basePayload = emptyQuestTimePayload();
  return {
    questPageId: 'quest-1',
    questTitle: 'Rescue the Duke',
    lifecycleState: NarrativeLifecycleStates.ACTIVE,
    questTime: basePayload,
    ...overrides,
  };
}

test('detectQuestTimeSignals emits expiry when deadline crossed', () => {
  const payload = mergeQuestTimeRules(emptyQuestTimePayload(), {
    expiresAtEpochMinute: '5000',
    autoFailOnExpiry: false,
  });
  const result = detectQuestTimeSignals({
    rows: [row({ questTime: payload })],
    previousEpochMinute: 4000n,
    nextEpochMinute: 6000n,
    elapsedMinutes: 2000n,
    dismissedExpiryKeys: new Set(),
  });
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0]?.kind, 'QUEST_EXPIRED');
});

test('detectQuestTimeSignals skips dismissed hybrid expiry', () => {
  const payload = mergeQuestTimeRules(emptyQuestTimePayload(), {
    expiresAtEpochMinute: '5000',
    autoFailOnExpiry: false,
  });
  const dismissKey = buildQuestExpiryDismissKey('quest-1', '5000');
  const result = detectQuestTimeSignals({
    rows: [row({ questTime: payload })],
    previousEpochMinute: 4000n,
    nextEpochMinute: 6000n,
    elapsedMinutes: 2000n,
    dismissedExpiryKeys: new Set([dismissKey]),
  });
  assert.equal(result.signals.length, 0);
});

test('detectQuestTimeSignals advances STEADY offscreen progress', () => {
  const payload = mergeQuestTimeRules(emptyQuestTimePayload(), {
    offscreenProgress: { totalMinutes: 100, posture: 'STEADY' },
  });
  const result = detectQuestTimeSignals({
    rows: [row({ questTime: payload })],
    previousEpochMinute: 0n,
    nextEpochMinute: 60n,
    elapsedMinutes: 60n,
    dismissedExpiryKeys: new Set(),
  });
  const state = result.nextStateByQuestId.get('quest-1');
  assert.equal(state?.elapsedOffscreenMinutes, 60);
});

test('detectQuestTimeSignals PASSIVE only advances when untouched', () => {
  const payload = mergeQuestTimeRules(emptyQuestTimePayload(), {
    offscreenProgress: { totalMinutes: 100, posture: 'PASSIVE' },
  });
  const withTouch = mergeQuestTimeState(payload, { partyTouchEpochMinute: '100' });
  const result = detectQuestTimeSignals({
    rows: [row({ questTime: withTouch, touchedThisBatch: true })],
    previousEpochMinute: 0n,
    nextEpochMinute: 60n,
    elapsedMinutes: 60n,
    dismissedExpiryKeys: new Set(),
  });
  assert.equal(result.nextStateByQuestId.get('quest-1')?.elapsedOffscreenMinutes ?? 0, 0);
});

test('detectQuestTimeSignals skips paused quests', () => {
  const payload = mergeQuestTimeRules(emptyQuestTimePayload(), {
    expiresAtEpochMinute: '100',
    isTimePressurePaused: true,
  });
  const result = detectQuestTimeSignals({
    rows: [row({ questTime: payload })],
    previousEpochMinute: 0n,
    nextEpochMinute: 200n,
    elapsedMinutes: 200n,
    dismissedExpiryKeys: new Set(),
  });
  assert.equal(result.signals.length, 0);
});

test('detectQuestTimeSignals emits escalation tier with stable id', () => {
  const payload = mergeQuestTimeRules(emptyQuestTimePayload(), {
    ignoredEscalation: {
      tiers: [
        {
          id: 'tier-a',
          afterDays: 3,
          title: 'Ritual intensifies',
          summary: 'The cult completes another rite.',
        },
      ],
    },
  });
  const withTouch = mergeQuestTimeState(payload, { partyTouchEpochMinute: '0' });
  const result = detectQuestTimeSignals({
    rows: [row({ questTime: withTouch })],
    previousEpochMinute: 0n,
    nextEpochMinute: 5000n,
    elapsedMinutes: 5000n,
    dismissedExpiryKeys: new Set(),
  });
  const tierSignal = result.signals.find((s) => s.kind === 'QUEST_ESCALATION_TIER_REACHED');
  assert.ok(tierSignal);
  if (tierSignal?.kind === 'QUEST_ESCALATION_TIER_REACHED') {
    assert.equal(tierSignal.tierId, 'tier-a');
  }
});
