import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildScheduledEffectSuggestionKey,
  buildScheduledTreasuryPulseBullets,
  computeDurationDueFires,
  computeInitialDurationNextFire,
  durationRecurrenceFromDays,
  durationRecurrenceFromWeeks,
  formatRecurrenceLabel,
  isNarrativeScheduledEffectKind,
  isTreasuryScheduledEffectKind,
  normalizeCalendarMonthRecurrence,
  normalizeDurationRecurrence,
  normalizeScheduledEffectSuppressionReason,
  scheduledEffectKindsForScope,
  scheduledEffectSuppressionReasonLabel,
} from './scheduledEffectMetadata.js';

describe('scheduledEffectMetadata', () => {
  it('normalizes duration recurrence to intervalMinutes only', () => {
    const rule = durationRecurrenceFromDays(7);
    assert.equal(rule.kind, 'duration');
    assert.equal(rule.intervalMinutes, 7 * 1440);
    assert.deepEqual(normalizeDurationRecurrence(rule), rule);
  });

  it('normalizes calendar month recurrence with clamped day', () => {
    const rule = normalizeCalendarMonthRecurrence({
      kind: 'calendar_month',
      dayOfMonth: 31,
      monthInterval: 2,
    });
    assert.ok(rule);
    assert.equal(rule.dayOfMonth, 28);
    assert.equal(rule.monthInterval, 2);
  });

  it('computes duration due fires within advance window', () => {
    const rule = durationRecurrenceFromWeeks(1);
    const { fires, remaining } = computeDurationDueFires({
      rule,
      nextFireEpochMinute: 10_080n,
      previousEpochMinute: 0n,
      nextEpochMinute: 30_240n,
      maxFires: 24,
    });
    assert.deepEqual(fires, [10_080n, 20_160n, 30_240n]);
    assert.equal(remaining, false);
  });

  it('computes initial duration next fire from anchor', () => {
    const rule = durationRecurrenceFromDays(30);
    assert.equal(computeInitialDurationNextFire(rule, 1000n), 1000n + BigInt(30 * 1440));
  });

  it('formats recurrence labels', () => {
    assert.equal(formatRecurrenceLabel(durationRecurrenceFromWeeks(1)), 'Every week');
    assert.equal(
      formatRecurrenceLabel({ kind: 'calendar_month', dayOfMonth: 1 }),
      'Monthly on day 1',
    );
  });

  it('builds stable suggestion idempotency keys', () => {
    assert.equal(
      buildScheduledEffectSuggestionKey('sched-1', 5000n),
      'scheduled-effect:sched-1:5000',
    );
  });

  it('builds pulse bullets for active schedules', () => {
    assert.deepEqual(
      buildScheduledTreasuryPulseBullets({ activeCount: 3, nextDueLabel: 'in 4 days' }),
      ['3 recurring treasury schedules active', 'Next due in 4 days'],
    );
  });

  it('classifies treasury and narrative effect kinds', () => {
    assert.equal(isTreasuryScheduledEffectKind('ledger_upkeep'), true);
    assert.equal(isNarrativeScheduledEffectKind('world_development_prompt'), true);
    assert.equal(isTreasuryScheduledEffectKind('world_development_prompt'), false);
  });

  it('maps list scopes to kind filters', () => {
    assert.deepEqual(scheduledEffectKindsForScope('treasury'), [
      'ledger_upkeep',
      'ledger_income',
    ]);
    assert.deepEqual(scheduledEffectKindsForScope('narrative'), [
      'world_development_prompt',
      'haven_threat_prompt',
    ]);
    assert.equal(scheduledEffectKindsForScope('all'), null);
  });

  it('normalizes suppression reasons', () => {
    assert.equal(
      normalizeScheduledEffectSuppressionReason('world_development_disabled'),
      'WORLD_DEVELOPMENT_DISABLED',
    );
    assert.equal(
      scheduledEffectSuppressionReasonLabel('WORLD_DEVELOPMENT_DISABLED'),
      'World Development disabled',
    );
  });
});
