import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isProjectionDebugEnabled } from './entityProjectionDebug.ts';

describe('entityProjectionDebug', () => {
  it('enables debug only for DM users with flag', () => {
    const params = new URLSearchParams('debugRelations=1');
    assert.equal(isProjectionDebugEnabled(params, true), true);
    assert.equal(isProjectionDebugEnabled(params, false), false);
    assert.equal(isProjectionDebugEnabled(new URLSearchParams(), true), false);
  });
});
