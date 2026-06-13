import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CategoryIndexChild } from '@/lib/wiki';
import {
  buildCodexHierarchyForest,
  buildParentTrailLabel,
  flattenCodexHierarchy,
} from './codexHierarchy.ts';
import {
  getCategoryEmptyCatalogMessage,
  getCategoryRefineFacetOrder,
} from './categoryBrowseRegistry.ts';

function child(
  id: string,
  title: string,
  parentId: string | null,
): CategoryIndexChild {
  return {
    id,
    title,
    parentId,
    visibility: 'Party',
    updatedAt: '',
    snippet: '',
  };
}

describe('buildCodexHierarchyForest', () => {
  const categoryId = 'cat-1';

  it('orphan re-roots when parent filtered out', () => {
    const all = [
      child('a', 'Kingdom', categoryId),
      child('b', 'Duchy', 'a'),
      child('c', 'City', 'b'),
    ];
    const filtered = [child('c', 'City', 'b')];
    const forest = buildCodexHierarchyForest(filtered, categoryId, {
      allChildren: all,
    });
    assert.equal(forest.length, 1);
    assert.equal(forest[0]?.id, 'c');
  });

  it('builds multi-level tree from filtered set', () => {
    const rows = [
      child('a', 'Kingdom', categoryId),
      child('b', 'Duchy', 'a'),
      child('c', 'City', 'b'),
    ];
    const forest = buildCodexHierarchyForest(rows, categoryId, {
      allChildren: rows,
    });
    assert.equal(forest.length, 1);
    assert.equal(forest[0]?.children[0]?.id, 'b');
    assert.equal(forest[0]?.children[0]?.children[0]?.id, 'c');
  });

  it('includeAncestorIds restores path when only leaf matches filter (post-v1 seam)', () => {
    const all = [
      child('a', 'Kingdom', categoryId),
      child('b', 'Duchy', 'a'),
      child('c', 'City', 'b'),
    ];
    const filtered = [child('c', 'City', 'b')];
    const withoutAncestors = buildCodexHierarchyForest(filtered, categoryId, {
      allChildren: all,
    });
    assert.equal(withoutAncestors.length, 1);
    assert.equal(withoutAncestors[0]?.id, 'c');

    const withAncestors = buildCodexHierarchyForest(filtered, categoryId, {
      allChildren: all,
      includeAncestorIds: new Set(['a', 'b']),
    });
    assert.equal(withAncestors.length, 1);
    assert.equal(withAncestors[0]?.id, 'a');
    assert.equal(withAncestors[0]?.children[0]?.id, 'b');
    assert.equal(withAncestors[0]?.children[0]?.children[0]?.id, 'c');
  });
});

describe('buildParentTrailLabel', () => {
  it('returns ancestor chain excluding category folder', () => {
    const categoryId = 'cat-1';
    const all = [
      child('a', 'Kingdom', categoryId),
      child('b', 'Duchy', 'a'),
      child('c', 'City', 'b'),
    ];
    const byId = new Map(all.map((c) => [c.id, c]));
    const label = buildParentTrailLabel(all[2]!, byId, categoryId);
    assert.equal(label, 'Kingdom › Duchy');
  });
});

describe('flattenCodexHierarchy', () => {
  it('respects expanded ids', () => {
    const rows = [
      child('a', 'Root', 'cat'),
      child('b', 'Child', 'a'),
    ];
    const forest = buildCodexHierarchyForest(rows, 'cat', { allChildren: rows });
    const expanded = new Set(['a']);
    const flat = flattenCodexHierarchy(
      forest,
      expanded,
      new Map(rows.map((c) => [c.id, c])),
      'cat',
    );
    assert.equal(flat.length, 2);
  });
});

describe('categoryBrowseRegistry', () => {
  it('provides Bestiary facet order', () => {
    const order = getCategoryRefineFacetOrder('Bestiary');
    assert.deepEqual(order, ['Region', 'Threat', 'Habitat', 'Type', 'Intelligence', '__narrativeStatus']);
  });

  it('provides codex empty copy for Quick Access', () => {
    assert.equal(
      getCategoryEmptyCatalogMessage('Quick Access'),
      'No quick access entries yet.',
    );
  });
});
