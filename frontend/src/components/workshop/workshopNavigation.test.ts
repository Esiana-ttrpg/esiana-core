import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWorkshopSyncSearch,
  shouldSyncWorkshopUrl,
} from './workshopNavigation.js';

describe('shouldSyncWorkshopUrl', () => {
  it('returns false when the section is inactive', () => {
    assert.equal(shouldSyncWorkshopUrl('?section=workshop', false), false);
  });

  it('returns false when the live URL is no longer workshop', () => {
    assert.equal(shouldSyncWorkshopUrl('?section=scenes', true), false);
  });

  it('returns true when active and still on workshop', () => {
    assert.equal(shouldSyncWorkshopUrl('?section=workshop&draft=abc', true), true);
  });
});

describe('buildWorkshopSyncSearch', () => {
  it('sets draft and clears anchors', () => {
    assert.equal(
      buildWorkshopSyncSearch('?section=workshop&anchors=page1', 'draft-1'),
      '?section=workshop&draft=draft-1',
    );
  });

  it('removes draft param for picker view', () => {
    assert.equal(buildWorkshopSyncSearch('?section=workshop&draft=old', null), '?section=workshop');
  });
});
