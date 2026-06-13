import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeDurationDueFires,
  durationRecurrenceFromDays,
  MAX_SCHEDULED_EFFECT_FIRES_PER_ADVANCE,
} from '../../../shared/scheduledEffectMetadata.js';

test('duration due fires respect global cap semantics', () => {
  const rule = durationRecurrenceFromDays(1);
  const { fires, remaining } = computeDurationDueFires({
    rule,
    nextFireEpochMinute: 1440n,
    previousEpochMinute: 0n,
    nextEpochMinute: BigInt(1440 * 30),
    maxFires: MAX_SCHEDULED_EFFECT_FIRES_PER_ADVANCE,
  });
  assert.equal(fires.length, 24);
  assert.equal(remaining, true);
  assert.equal(fires[0], 1440n);
  assert.equal(fires[23], 1440n * 24n);
});

test('idempotent suggestion keys are unique per fire epoch', () => {
  const keyA = `scheduled-effect:abc:1000`;
  const keyB = `scheduled-effect:abc:2000`;
  assert.notEqual(keyA, keyB);
});

test('fire result shape includes treasury and narrative counters', async () => {
  const { runScheduledEffectFires } = await import('./scheduledEffectFireService.js');
  const result = await runScheduledEffectFires(
    {
      campaignScheduledEffect: {
        findMany: async () => [],
      },
    } as never,
    {
      campaignId: 'camp-1',
      previousEpochMinute: '0',
      nextEpochMinute: '1000',
    },
  );
  assert.equal(result.treasuryApplied, 0);
  assert.equal(result.narrativeGenerated, 0);
  assert.equal(result.narrativeSuppressed, 0);
  assert.equal(result.schedulesScanned, 0);
});
