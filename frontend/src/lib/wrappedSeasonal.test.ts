import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSeasonalWrappedTargetYearClient,
  wrappedInviteDismissKey,
} from './wrappedSeasonal.ts';

describe('wrappedSeasonal client helpers', () => {
  it('matches Dec/Jan target year and dismiss key', () => {
    const dec = resolveSeasonalWrappedTargetYearClient(
      'UTC',
      new Date('2026-12-20T12:00:00.000Z'),
    );
    const jan = resolveSeasonalWrappedTargetYearClient(
      'UTC',
      new Date('2027-01-05T12:00:00.000Z'),
    );
    assert.equal(dec, 2026);
    assert.equal(jan, 2026);
    assert.equal(wrappedInviteDismissKey(2026), 'wrapped-invite:2026');
  });

  it('is inactive outside the seasonal window', () => {
    assert.equal(
      resolveSeasonalWrappedTargetYearClient(
        'UTC',
        new Date('2026-11-02T12:00:00.000Z'),
      ),
      null,
    );
  });
});
