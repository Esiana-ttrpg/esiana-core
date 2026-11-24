import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  metricEstimated,
  metricPartial,
  metricUnavailable,
  metricValue,
  readMetricAmount,
} from './metricValue.js';

describe('metricValue', () => {
  it('keeps measured zero distinct from unavailable', () => {
    assert.deepEqual(metricValue(0), { status: 'zero', amount: 0 });
    assert.equal(readMetricAmount(metricValue(0)), 0);
    assert.equal(readMetricAmount(metricUnavailable('not_yet_tracked')), null);
  });

  it('exposes estimated and partial amounts without treating them as unavailable', () => {
    assert.deepEqual(metricEstimated(12), { status: 'estimated', amount: 12 });
    assert.deepEqual(metricPartial(8), { status: 'partial', amount: 8 });
    assert.equal(readMetricAmount(metricEstimated(12)), 12);
    assert.equal(readMetricAmount(metricPartial(8)), 8);
  });
});
