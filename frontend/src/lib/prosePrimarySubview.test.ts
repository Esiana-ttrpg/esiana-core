import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isProsePrimarySubview } from './prosePrimarySubview.ts';

describe('isProsePrimarySubview', () => {
  it('is true for lore and biography in edit mode', () => {
    assert.equal(isProsePrimarySubview('lore', false, true), true);
    assert.equal(isProsePrimarySubview('biography', false, true), true);
  });

  it('is true for event lore pages in edit mode', () => {
    assert.equal(isProsePrimarySubview('overview', true, true), true);
  });

  it('is false for overview and read mode', () => {
    assert.equal(isProsePrimarySubview('overview', false, true), false);
    assert.equal(isProsePrimarySubview('lore', false, false), false);
  });
});
