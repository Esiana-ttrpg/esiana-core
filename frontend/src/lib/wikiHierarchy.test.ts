import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WikiPageParentRef, WikiTreeNode } from '@/types/wiki';
import {
  buildParentChainFromFlatPages,
  buildWikiBreadcrumbs,
  buildWikiNavBreadcrumbs,
  buildWikiPageLookup,
  formatIndexLocationTrail,
  hydrateParentChainTitles,
  resolveWikiParentChain,
} from './wikiHierarchy.js';

function makeNode(
  id: string,
  title: string,
  parentId: string | null,
): WikiTreeNode {
  return {
    id,
    campaignId: 'camp',
    title,
    parentId,
    visibility: 'Public',
    featuredImageId: null,
    templateType: 'DEFAULT',
    children: [],
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };
}

function flattenParentTitles(
  chain: WikiPageParentRef | null | undefined,
): string[] {
  const titles: string[] = [];
  let node: WikiPageParentRef | null | undefined = chain;
  while (node) {
    titles.push(node.title);
    node = node.parent ?? null;
  }
  return titles;
}

describe('buildParentChainFromFlatPages', () => {
  it('builds nested WikiPageParentRef matching API bottom-up fold', () => {
    const flatPages = [
      makeNode('world', 'World', null),
      makeNode('locations', 'Locations', 'world'),
      makeNode('sword-coast', 'Sword Coast', 'locations'),
      makeNode('greenest', 'Greenest', 'sword-coast'),
      makeNode('inn', 'The Purple Dragon Inn', 'greenest'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const built = buildParentChainFromFlatPages('inn', pageById);

    const apiParent: WikiPageParentRef = {
      id: 'greenest',
      title: 'Greenest',
      parent: {
        id: 'sword-coast',
        title: 'Sword Coast',
        parent: {
          id: 'locations',
          title: 'Locations',
          parent: { id: 'world', title: 'World', parent: null },
        },
      },
    };

    assert.deepEqual(flattenParentTitles(built), flattenParentTitles(apiParent));
  });

  it('resolves chains deeper than the legacy API depth cap', () => {
    const flatPages = [
      makeNode('world', 'World', null),
      makeNode('locations', 'Locations', 'world'),
      makeNode('l1', 'Level 1', 'locations'),
      makeNode('l2', 'Level 2', 'l1'),
      makeNode('l3', 'Level 3', 'l2'),
      makeNode('l4', 'Level 4', 'l3'),
      makeNode('l5', 'Level 5', 'l4'),
      makeNode('l6', 'Level 6', 'l5'),
      makeNode('leaf', 'Deep Leaf', 'l6'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const built = buildParentChainFromFlatPages('leaf', pageById);

    assert.equal(flattenParentTitles(built).length, 8);
  });

  it('terminates on cyclic parent references', () => {
    const flatPages = [
      makeNode('a', 'Page A', 'b'),
      makeNode('b', 'Page B', 'a'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const built = buildParentChainFromFlatPages('a', pageById);
    assert.ok(built);
    assert.ok(flattenParentTitles(built).length <= 2);
  });
});

describe('buildWikiBreadcrumbs', () => {
  it('strips structural and category index folders from the trail', () => {
    const flatPages = [
      makeNode('world', 'World', null),
      makeNode('locations', 'Locations', 'world'),
      makeNode('sword-coast', 'Sword Coast', 'locations'),
      makeNode('greenest', 'Greenest', 'sword-coast'),
      makeNode('inn', 'The Purple Dragon Inn', 'greenest'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const parentChain = buildParentChainFromFlatPages('inn', pageById);
    const crumbs = buildWikiBreadcrumbs(parentChain, {
      id: 'inn',
      title: 'The Purple Dragon Inn',
    });

    assert.deepEqual(
      crumbs.map((crumb) => crumb.title),
      ['Sword Coast', 'Greenest', 'The Purple Dragon Inn'],
    );
  });
});

describe('buildWikiNavBreadcrumbs', () => {
  it('keeps category index folders but strips World and reserved system pages', () => {
    const flatPages = [
      makeNode('world', 'World', null),
      makeNode('locations', 'Locations', 'world'),
      makeNode('sword-coast', 'Sword Coast', 'locations'),
      makeNode('greenest', 'Greenest', 'sword-coast'),
      makeNode('inn', 'The Purple Dragon Inn', 'greenest'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const parentChain = buildParentChainFromFlatPages('inn', pageById);
    const crumbs = buildWikiNavBreadcrumbs(parentChain, {
      id: 'inn',
      title: 'The Purple Dragon Inn',
    });

    assert.deepEqual(
      crumbs.map((crumb) => crumb.title),
      ['Locations', 'Sword Coast', 'Greenest', 'The Purple Dragon Inn'],
    );
  });

  it('includes Characters category for character pages', () => {
    const flatPages = [
      makeNode('world', 'World', null),
      makeNode('chars', 'Characters', 'world'),
      makeNode('salt-bay', 'Salt Bay', 'chars'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const parentChain = buildParentChainFromFlatPages('salt-bay', pageById);
    const crumbs = buildWikiNavBreadcrumbs(parentChain, {
      id: 'salt-bay',
      title: 'Salt Bay',
    });

    assert.deepEqual(
      crumbs.map((crumb) => crumb.title),
      ['Characters', 'Salt Bay'],
    );
  });
});

describe('resolveWikiParentChain', () => {
  it('falls back to API parent when pageById is empty', () => {
    const apiParent: WikiPageParentRef = {
      id: 'greenest',
      title: 'Greenest',
      parent: null,
    };
    const resolved = resolveWikiParentChain('inn', apiParent, new Map());
    assert.deepEqual(resolved, apiParent);
  });

  it('falls back to API parent when the page is missing from the tree', () => {
    const apiParent: WikiPageParentRef = {
      id: 'greenest',
      title: 'Greenest',
      parent: null,
    };
    const pageById = buildWikiPageLookup([
      makeNode('other', 'Other', null),
    ]);
    const resolved = resolveWikiParentChain('inn', apiParent, pageById);
    assert.deepEqual(resolved, apiParent);
  });

});

describe('formatIndexLocationTrail', () => {
  it('returns null for direct children of the category folder', () => {
    const flatPages = [
      makeNode('chars', 'Characters', null),
      makeNode('hero', 'Hero', 'chars'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const trail = formatIndexLocationTrail(
      { id: 'hero', title: 'Hero', parentId: 'chars' },
      'chars',
      'Characters',
      pageById,
    );
    assert.equal(trail, null);
  });

  it('returns ancestor trail for nested pages', () => {
    const flatPages = [
      makeNode('chars', 'Characters', null),
      makeNode('world', 'World', null),
      makeNode('shadowdale', 'Shadowdale', 'world'),
      makeNode('elminster', 'Elminster', 'shadowdale'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const trail = formatIndexLocationTrail(
      { id: 'elminster', title: 'Elminster', parentId: 'shadowdale' },
      'chars',
      'Characters',
      pageById,
    );
    assert.equal(trail, 'World › Shadowdale');
  });
});

describe('hydrateParentChainTitles', () => {
  it('preserves ancestor order when hydrating a flat-tree-built chain', () => {
    const flatPages = [
      makeNode('world', 'World', null),
      makeNode('locations', 'Locations', 'world'),
      makeNode('sword-coast', 'Sword Coast', 'locations'),
      makeNode('greenest', 'Greenest', 'sword-coast'),
      makeNode('inn', 'The Purple Dragon Inn', 'greenest'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const built = buildParentChainFromFlatPages('inn', pageById);
    const hydrated = hydrateParentChainTitles(built, pageById);

    assert.deepEqual(flattenParentTitles(hydrated), [
      'Greenest',
      'Sword Coast',
      'Locations',
      'World',
    ]);
  });

  it('replaces stale API titles with fresh flat tree titles', () => {
    const flatPages = [
      makeNode('world', 'World', null),
      makeNode('inn', 'Renamed Inn', 'world'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const stale: WikiPageParentRef = {
      id: 'world',
      title: 'Old World Name',
      parent: null,
    };
    const hydrated = hydrateParentChainTitles(stale, pageById);
    assert.equal(hydrated?.title, 'World');
  });
});

describe('resolveWikiParentChain (continued)', () => {
  it('prefers the flat tree when the page exists in pageById', () => {
    const flatPages = [
      makeNode('locations', 'Locations', null),
      makeNode('sword-coast', 'Sword Coast', 'locations'),
      makeNode('inn', 'The Purple Dragon Inn', 'sword-coast'),
    ];
    const pageById = buildWikiPageLookup(flatPages);
    const apiParent: WikiPageParentRef = {
      id: 'truncated',
      title: 'Truncated',
      parent: null,
    };
    const resolved = resolveWikiParentChain('inn', apiParent, pageById);
    assert.deepEqual(flattenParentTitles(resolved), [
      'Sword Coast',
      'Locations',
    ]);
  });
});
