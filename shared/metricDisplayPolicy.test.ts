import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldDisplayMetric } from './metricDisplayPolicy.js';
import { metricValue } from './metricValue.js';

describe('metricDisplayPolicy', () => {
  it('hides unused zero metrics on established campaigns', () => {
    const signals = { totalWords: 50_000, pageCount: 120 };
    assert.equal(
      shouldDisplayMetric(
        'snapshot.connectionCount',
        metricValue(0),
        signals,
      ),
      'hide',
    );
  });

  it('shows encouraging empty state for early campaigns', () => {
    const signals = { totalWords: 500, pageCount: 3 };
    assert.equal(
      shouldDisplayMetric(
        'snapshot.connectionCount',
        metricValue(0),
        signals,
      ),
      'empty_state_encouraging',
    );
  });
});
