import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import type { CategoryIndexChild } from '@/lib/wiki';
import {
  createDefaultRefineState,
  getCategoryIndexFacetDefs,
  projectCategoryIndexBrowseChildren,
} from './categoryIndexBrowse.ts';
import { getCategoryRefineFacetOrder } from './categoryBrowseRegistry.ts';
import { buildCodexHierarchyForest } from './codexHierarchy.ts';

const frontendSrc = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function child(
  id: string,
  title: string,
  metadata?: CategoryIndexChild['metadata'],
  parentId: string | null = null,
): CategoryIndexChild {
  return {
    id,
    title,
    parentId,
    visibility: 'Party',
    updatedAt: '',
    snippet: '',
    metadata,
  };
}

describe('entityBrowser projection drift guard', () => {
  it('card, table, and hierarchy modes share one projected id set', () => {
    const categoryTitle = 'Locations';
    const categoryPageId = 'cat-locations';
    const rows = [
      child('a', 'Rivendale', { fields: [{ key: 'Region', value: 'North' }] } as CategoryIndexChild['metadata'], categoryPageId),
      child('b', 'Silverwood', { fields: [{ key: 'Region', value: 'South' }] } as CategoryIndexChild['metadata'], 'a'),
      child('c', 'Harbor Town', { fields: [{ key: 'Region', value: 'North' }] } as CategoryIndexChild['metadata'], categoryPageId),
    ];
    const facetDefs = getCategoryIndexFacetDefs(categoryTitle, false);
    const refineState = createDefaultRefineState(facetDefs, rows, categoryTitle);
    refineState.Region = { North: true, South: false, '(unset)': false };

    const projected = projectCategoryIndexBrowseChildren(rows, {
      searchQuery: '',
      refineState,
      facetDefs,
      categoryTitle,
    });
    const projectedIds = projected.map((row) => row.id).sort();

    const cardIds = [...projected].map((row) => row.id).sort();
    const tableIds = [...projected].map((row) => row.id).sort();
    const hierarchyForest = buildCodexHierarchyForest(projected, categoryPageId, {
      allChildren: rows,
    });
    const hierarchyIds = hierarchyForest
      .flatMap(function collect(node): string[] {
        return [node.id, ...node.children.flatMap(collect)];
      })
      .sort();

    assert.deepEqual(cardIds, projectedIds);
    assert.deepEqual(tableIds, projectedIds);
    assert.deepEqual(hierarchyIds, projectedIds);
    assert.deepEqual(projectedIds, ['a', 'c']);
  });

  it('facet defs follow categoryBrowseRegistry order', () => {
    for (const categoryTitle of ['Bestiary', 'Locations', 'Characters'] as const) {
      const registryOrder = getCategoryRefineFacetOrder(categoryTitle);
      const facetDefs = getCategoryIndexFacetDefs(categoryTitle, false);
      assert.deepEqual(
        facetDefs.map((facet) => facet.id),
        registryOrder,
        categoryTitle,
      );
    }
  });

  it('EntityBrowserView wires filteredChildren to every view mode', () => {
    const source = fs.readFileSync(
      path.join(frontendSrc, 'components/wiki/WikiIndexView.tsx'),
      'utf8',
    );
    assert.match(source, /projectCategoryIndexBrowseChildren/);
    assert.match(source, /children=\{filteredChildren\}/);
    assert.match(source, /filteredChildren=\{filteredChildren\}/);
    assert.match(source, /\{filteredChildren\.map\(\(child\)/);
  });

  it('view shells do not run browse search/refine projection', () => {
    const shells = [
      'components/IndexGridView.tsx',
      'components/wiki/indexBrowse/CodexHierarchyView.tsx',
    ];
    for (const rel of shells) {
      const source = fs.readFileSync(path.join(frontendSrc, rel), 'utf8');
      assert.doesNotMatch(source, /matchesCategoryIndexSearch/);
      assert.doesNotMatch(source, /matchesCategoryIndexRefine/);
      assert.doesNotMatch(source, /filterAndSortCategoryIndexChildren/);
      assert.doesNotMatch(source, /projectCategoryIndexBrowseChildren/);
    }
  });
});
