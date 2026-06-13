import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveIdentityDisplay } from './useIdentityDisplay.ts';

describe('resolveIdentityDisplay', () => {
  it('prefers wiki title when mapped', () => {
    const result = resolveIdentityDisplay({
      label: 'Elara Moonwhisper',
      displayName: 'Elara Moonwhisper',
      playerContext: 'Ada Lovelace',
      identityPageId: 'page-1',
    });

    assert.equal(result.primaryLabel, 'Elara Moonwhisper');
    assert.equal(result.showSecondary, true);
    assert.equal(result.playerContext, 'Ada Lovelace');
  });

  it('uses account label when unmapped', () => {
    const result = resolveIdentityDisplay({
      label: 'Ada Lovelace',
      playerContext: 'Ada Lovelace',
    });

    assert.equal(result.primaryLabel, 'Ada Lovelace');
    assert.equal(result.showSecondary, false);
  });
});
