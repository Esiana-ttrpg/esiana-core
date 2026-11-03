import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSeasonalWrappedTargetYear,
  resolveWrappedEdition,
  wrappedInviteDismissKey,
} from './editionState.js';

describe('resolveWrappedEdition', () => {
  it('stays preview until local year end', () => {
    const edition = resolveWrappedEdition({
      year: 2026,
      timeZone: 'America/New_York',
      now: new Date('2026-12-31T23:00:00.000Z'), // still Dec 31 evening ET
    });
    assert.equal(edition, 'preview');
  });

  it('becomes completed after local Jan 1', () => {
    const edition = resolveWrappedEdition({
      year: 2026,
      timeZone: 'America/New_York',
      now: new Date('2027-01-01T05:00:00.000Z'), // midnight ET
    });
    assert.equal(edition, 'completed');
  });

  it('does not use server calendar alone across TZ', () => {
    // 2027-01-01 04:30 UTC is still 2026-12-31 23:30 in America/New_York
    const edition = resolveWrappedEdition({
      year: 2026,
      timeZone: 'America/New_York',
      now: new Date('2027-01-01T04:30:00.000Z'),
    });
    assert.equal(edition, 'preview');
  });
});

describe('resolveSeasonalWrappedTargetYear', () => {
  it('promotes current year in late December', () => {
    const year = resolveSeasonalWrappedTargetYear({
      timeZone: 'UTC',
      now: new Date('2026-12-20T12:00:00.000Z'),
    });
    assert.equal(year, 2026);
  });

  it('promotes previous year in early January', () => {
    const year = resolveSeasonalWrappedTargetYear({
      timeZone: 'UTC',
      now: new Date('2027-01-10T12:00:00.000Z'),
    });
    assert.equal(year, 2026);
  });

  it('returns null outside the seasonal window', () => {
    const year = resolveSeasonalWrappedTargetYear({
      timeZone: 'UTC',
      now: new Date('2026-11-02T12:00:00.000Z'),
    });
    assert.equal(year, null);
  });

  it('uses a stable dismiss key for both windows', () => {
    assert.equal(wrappedInviteDismissKey(2026), 'wrapped-invite:2026');
  });
});
