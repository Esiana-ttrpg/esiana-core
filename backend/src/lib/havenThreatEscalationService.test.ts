import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HAVEN_THREAT_ESCALATION_ACTIVITY_SUMMARIES,
  MINUTES_PER_DAY,
} from '../../../shared/downtimeContinuityIntegration.js';

test('uses deterministic activity log summaries', () => {
  assert.equal(
    HAVEN_THREAT_ESCALATION_ACTIVITY_SUMMARIES.low_to_rising,
    'Threat severity increased from Low to Rising after remaining unresolved.',
  );
  assert.equal(
    HAVEN_THREAT_ESCALATION_ACTIVITY_SUMMARIES.rising_to_critical,
    'Threat severity increased from Rising to Critical after remaining unresolved.',
  );
});

test('documents low-tier threshold as 14 campaign days', () => {
  assert.equal(14n * MINUTES_PER_DAY, 20160n);
});
