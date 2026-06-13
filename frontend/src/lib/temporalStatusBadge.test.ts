import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatActiveRangeLabel,
  formatBornLabel,
  formatDiedLabel,
} from '../components/entity/TemporalStatusBadge.tsx';

describe('TemporalStatusBadge labels', () => {
  it('formats active range with present end', () => {
    assert.equal(
      formatActiveRangeLabel({ year: 402, month: null, day: null }, null),
      'Active: Y402–present',
    );
  });

  it('formats died and born labels', () => {
    assert.equal(formatDiedLabel({ year: 410, month: null, day: null }), 'Died: Y410');
    assert.equal(formatBornLabel({ year: 398, month: null, day: null }), 'Born: Y398');
  });
});
