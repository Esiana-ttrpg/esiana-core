import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CategoryIndexChild } from '@/lib/wiki';
import {
  buildCategoryIndexSearchHaystack,
  categoryIndexSearchRank,
  compareCategoryIndexSearchRank,
  createDefaultRefineState,
  filterAndSortCategoryIndexChildren,
  findSimilarCategoryIndexEntries,
  formatCategoryIndexResultCount,
  getCategoryIndexFacetDefs,
  hasActiveCategoryIndexRefine,
  matchesCategoryIndexSearch,
} from './categoryIndexBrowse.ts';
import { getCategoryEmptyState, resolveCategoryIndexEmptyVariant } from './categoryIndexEmptyState.ts';

function child(
  title: string,
  metadata?: CategoryIndexChild['metadata'],
): CategoryIndexChild {
  return {
    id: title,
    title,
    parentId: null,
    visibility: 'Party',
    updatedAt: '',
    snippet: '',
    metadata,
  };
}

describe('categoryIndexBrowse search', () => {
  it('matches knownFor for characters', () => {
    const row = child('Alden', {
      firstName: 'Alden',
      knownFor: 'Exiled heir',
      quickInfo: [],
    } as CategoryIndexChild['metadata']);
    assert.equal(
      matchesCategoryIndexSearch(row, 'exiled', 'Characters'),
      true,
    );
    const haystack = buildCategoryIndexSearchHaystack(row, 'Characters');
    assert.ok(haystack.includes('exiled heir'));
  });

  it('ranks title matches higher', () => {
    const exact = child('Kaelin');
    const partial = child('Ser Kaelin of Mirefall');
    const other = child('Kaelan Voss', {
      fields: [{ key: 'Affiliation', value: 'Kaelin guild' }],
    } as CategoryIndexChild['metadata']);
    assert.ok(
      compareCategoryIndexSearchRank(exact, partial, 'kaelin') <= 0,
    );
    assert.ok(categoryIndexSearchRank(exact, 'kaelin') > categoryIndexSearchRank(other, 'kaelin'));
  });
});

describe('categoryIndexBrowse refine', () => {
  it('omits visibility facet for non-DM', () => {
    const defs = getCategoryIndexFacetDefs('Organizations', false);
    assert.ok(!defs.some((facet) => facet.id === '__visibility'));
    const dmDefs = getCategoryIndexFacetDefs('Organizations', true);
    assert.ok(dmDefs.some((facet) => facet.id === '__visibility'));
  });

  it('filters by affiliation facet', () => {
    const rows = [
      child('A', {
        firstName: 'A',
        quickInfo: [{ key: 'Affiliation', value: 'Order' }],
      } as CategoryIndexChild['metadata']),
      child('B', {
        firstName: 'B',
        quickInfo: [{ key: 'Affiliation', value: 'Guild' }],
      } as CategoryIndexChild['metadata']),
    ];
    const facetDefs = getCategoryIndexFacetDefs('Characters', false);
    const refineState = createDefaultRefineState(facetDefs, rows, 'Characters');
    refineState.Affiliation = { Order: true, Guild: false };
    const filtered = filterAndSortCategoryIndexChildren(rows, {
      searchQuery: '',
      refineState,
      facetDefs,
      categoryTitle: 'Characters',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.title, 'A');
    assert.equal(
      hasActiveCategoryIndexRefine(refineState, facetDefs, rows, 'Characters'),
      true,
    );
  });
});

describe('findSimilarCategoryIndexEntries', () => {
  it('finds partial title matches', () => {
    const rows = [child('Kaelan Voss'), child('Ser Kaelin of Mirefall')];
    const similar = findSimilarCategoryIndexEntries(rows, 'Kaelin');
    assert.ok(similar.length >= 1);
    assert.ok(similar.some((row) => row.title.includes('Kaelin')));
  });
});

describe('categoryIndexEmptyState', () => {
  it('search miss allows create CTA', () => {
    const variant = resolveCategoryIndexEmptyVariant({
      totalCount: 5,
      filteredCount: 0,
      searchQuery: 'Kaelin',
      hasActiveRefine: false,
      canCreate: true,
    });
    assert.equal(variant, 'search_miss');
    const state = getCategoryEmptyState({
      totalCount: 5,
      filteredCount: 0,
      searchQuery: 'Kaelin',
      hasActiveRefine: false,
      canCreate: true,
      categoryTitle: 'Characters',
      itemLabel: 'Character',
    });
    assert.equal(state.showCreateFromSearch, true);
    assert.match(state.message, /No characters match/);
  });

  it('refine miss does not offer create CTA', () => {
    const state = getCategoryEmptyState({
      totalCount: 5,
      filteredCount: 0,
      searchQuery: '',
      hasActiveRefine: true,
      canCreate: true,
      categoryTitle: 'Characters',
      itemLabel: 'Character',
    });
    assert.equal(state.showCreateFromSearch, false);
    assert.equal(state.showResetRefine, true);
  });
});

describe('formatCategoryIndexResultCount', () => {
  it('uses singular noun when browse is active and one row matches', () => {
    assert.equal(
      formatCategoryIndexResultCount(5, 1, 'Characters', 'aria', false),
      'Showing 1 of 5',
    );
    assert.equal(
      formatCategoryIndexResultCount(1, 1, 'Characters', 'aria', false),
      '1 character',
    );
  });

  it('uses plural noun when all rows match during search', () => {
    assert.equal(
      formatCategoryIndexResultCount(317, 317, 'Characters', 'aria', false),
      '317 characters',
    );
  });

  it('returns null when browse is inactive and all rows match', () => {
    assert.equal(
      formatCategoryIndexResultCount(12, 12, 'Organizations', '', false),
      null,
    );
  });
});
