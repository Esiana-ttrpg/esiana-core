import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isProgressionIndexPath } from './useProgressionRoute.js';

describe('isProgressionIndexPath', () => {
  it('matches canonical campaign progression routes', () => {
    assert.equal(isProgressionIndexPath('/campaigns/my-campaign/progression'), true);
    assert.equal(isProgressionIndexPath('/campaigns/my-campaign/progression/'), true);
  });

  it('rejects legacy /c/ paths and nested progression routes', () => {
    assert.equal(isProgressionIndexPath('/c/my-campaign/progression'), false);
    assert.equal(isProgressionIndexPath('/campaigns/my-campaign/progression/extra'), false);
    assert.equal(isProgressionIndexPath('/campaigns/my-campaign/adventures'), false);
  });
});
