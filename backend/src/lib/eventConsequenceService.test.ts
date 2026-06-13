import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapRouteChangeToEconomicSignal } from '../../../shared/eventConsequence.js';

test('mapRouteChangeToEconomicSignal maps narrative severity to trade disruption', () => {
  const minor = mapRouteChangeToEconomicSignal({ severity: 'minor', reason: 'banditry' });
  const major = mapRouteChangeToEconomicSignal({ severity: 'major', reason: 'war' });
  assert.equal(minor.signal, 'trade_disruption');
  assert.equal(major.signal, 'trade_disruption');
  assert.ok(minor.trafficWeight > major.trafficWeight);
});
