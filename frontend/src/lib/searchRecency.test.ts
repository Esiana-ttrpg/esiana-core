import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearRecentSearches,
  clearSearchRecencyForTests,
  listRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
} from './searchRecency.js';

describe('searchRecency', () => {
  it('records, lists, removes, and clears recent searches per campaign', () => {
    clearSearchRecencyForTests();
    recordRecentSearch('camp-a', 'Yuna');
    recordRecentSearch('camp-a', 'Besaid');
    recordRecentSearch('camp-a', 'Yuna');
    recordRecentSearch('camp-b', 'Other');

    assert.deepEqual(listRecentSearches('camp-a'), ['Yuna', 'Besaid']);
    assert.deepEqual(listRecentSearches('camp-b'), ['Other']);

    removeRecentSearch('camp-a', 'Yuna');
    assert.deepEqual(listRecentSearches('camp-a'), ['Besaid']);

    clearRecentSearches('camp-a');
    assert.deepEqual(listRecentSearches('camp-a'), []);
    assert.deepEqual(listRecentSearches('camp-b'), ['Other']);
  });

  it('ignores queries shorter than 2 characters', () => {
    clearSearchRecencyForTests();
    recordRecentSearch('camp-a', 'a');
    assert.deepEqual(listRecentSearches('camp-a'), []);
  });
});
