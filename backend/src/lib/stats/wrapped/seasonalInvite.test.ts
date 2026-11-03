import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSeasonalWrappedTargetYear,
  wrappedInviteDismissKey,
} from './editionState.js';

describe('seasonal invite target year consistency', () => {
  it('uses the same dismiss key for December preview and January completed', () => {
    const dec = resolveSeasonalWrappedTargetYear({
      timeZone: 'UTC',
      now: new Date('2026-12-20T12:00:00.000Z'),
    });
    const jan = resolveSeasonalWrappedTargetYear({
      timeZone: 'UTC',
      now: new Date('2027-01-10T12:00:00.000Z'),
    });
    assert.equal(dec, 2026);
    assert.equal(jan, 2026);
    assert.equal(wrappedInviteDismissKey(dec!), wrappedInviteDismissKey(jan!));
    assert.equal(wrappedInviteDismissKey(2026), 'wrapped-invite:2026');
  });
});
