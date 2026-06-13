import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeFillerPageCount } from './buildBenchmarkFillerOps.js';

describe('buildBenchmarkFillerOps', () => {
  it('computes filler pages from profile targets', () => {
    const filler = computeFillerPageCount({
      pageCount: 100,
      locationCount: 25,
      organizationCount: 10,
      characterCount: 50,
      sessionCount: 25,
      mapCount: 2,
    });
    assert.ok(filler >= 0);
    assert.ok(filler < 100);
  });
});
