import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterCampaignSearchEntries,
  formatCampaignSearchResultHint,
} from '../hooks/useCampaignSearch.js';
import type { WikiLinkIndexEntry } from '../lib/wikiLoreGraph.js';

const entries: WikiLinkIndexEntry[] = [
  {
    pageId: '1',
    title: 'Mario',
    label: 'Mario',
    normalizedLabel: 'mario',
    breadcrumbLabel: 'Characters',
    codexType: 'character',
  },
  {
    pageId: '2',
    title: 'Peach Castle',
    label: 'Peach Castle',
    normalizedLabel: 'peach castle',
    breadcrumbLabel: 'Locations',
    templateType: 'location',
  },
];

describe('filterCampaignSearchEntries', () => {
  it('returns empty results for blank query', () => {
    assert.deepEqual(filterCampaignSearchEntries(entries, ''), []);
  });

  it('matches title and breadcrumb labels', () => {
    assert.deepEqual(
      filterCampaignSearchEntries(entries, 'characters').map((entry) => entry.pageId),
      ['1'],
    );
    assert.deepEqual(
      filterCampaignSearchEntries(entries, 'peach').map((entry) => entry.pageId),
      ['2'],
    );
  });
});

describe('formatCampaignSearchResultHint', () => {
  it('combines breadcrumb and type hints', () => {
    assert.equal(
      formatCampaignSearchResultHint(entries[0]!),
      'Characters · character',
    );
  });
});
