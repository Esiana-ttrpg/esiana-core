import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CategoryIndexChild } from '@/lib/wiki';
import {
  buildLocationBrowseRow,
  readLocationBrowseCell,
} from './locationBrowseProjection.ts';
import {
  getCategoryDefaultColumns,
  getCategoryColumnDefs,
  getCategoryOptionalColumns,
  normalizeSelectedOptionalColumnKeys,
} from './metadataConfig.ts';
import {
  getCategoryDefaultView,
  getCategoryRefineFacetOrder,
} from './categoryBrowseRegistry.ts';

function child(
  id: string,
  title: string,
  parentId: string | null,
  metadata?: CategoryIndexChild['metadata'],
): CategoryIndexChild {
  return {
    id,
    title,
    parentId,
    visibility: 'Party',
    updatedAt: '',
    snippet: 'A quiet harbor.',
    metadata,
  };
}

describe('locationBrowseProjection', () => {
  const categoryPageId = 'cat-locations';
  const flatPages = [
    { id: categoryPageId, title: 'Locations' },
    { id: 'region-n', title: 'Northern Reach' },
    { id: 'map-1', title: 'Coast Chart' },
    { id: 'rel-1', title: 'Sister Port' },
  ];
  const pageById = new Map(flatPages.map((p) => [p.id, p as never]));

  it('builds parent/region and key connections from hierarchy', () => {
    const rows = [
      child('parent', 'Silverwood', categoryPageId),
      child('leaf', 'Harbor', 'parent', {
        fields: [{ key: 'Type', value: 'Town' }],
        regionPageId: 'region-n',
        currentStatus: 'Prosperous',
      } as CategoryIndexChild['metadata']),
    ];
    const ctx = {
      categoryPageId,
      allIndexChildren: rows,
      flatPages,
      pageById,
    };
    const row = buildLocationBrowseRow(rows[1], ctx);
    assert.equal(row.parentRegionLabel, 'Silverwood · Northern Reach');
    assert.equal(row.type, 'Town');
    assert.equal(row.status, 'Prosperous');
    assert.equal(row.keyConnections, null);
  });

  it('prefers child count for key connections', () => {
    const rows = [
      child('hub', 'Hub', categoryPageId),
      child('c1', 'A', 'hub'),
      child('c2', 'B', 'hub'),
    ];
    const row = buildLocationBrowseRow(rows[0], {
      categoryPageId,
      allIndexChildren: rows,
      flatPages,
      pageById,
    });
    assert.equal(row.keyConnections, '2 places');
  });

  it('omits empty map presence and resolves linked map title', () => {
    const bare = buildLocationBrowseRow(child('x', 'X', categoryPageId), {
      categoryPageId,
      allIndexChildren: [],
      flatPages,
      pageById,
    });
    assert.equal(bare.mapPresence, null);

    const linked = buildLocationBrowseRow(
      child('y', 'Y', categoryPageId, {
        mapPageId: 'map-1',
      } as CategoryIndexChild['metadata']),
      {
        categoryPageId,
        allIndexChildren: [],
        flatPages,
        pageById,
      },
    );
    assert.equal(linked.mapPresence, 'Coast Chart');
  });

  it('readLocationBrowseCell maps column keys', () => {
    const row = buildLocationBrowseRow(
      child('z', 'Z', categoryPageId, {
        relatedLocationIds: ['rel-1'],
      } as CategoryIndexChild['metadata']),
      {
        categoryPageId,
        allIndexChildren: [],
        flatPages,
        pageById,
      },
    );
    assert.equal(readLocationBrowseCell(row, 'Key Connections'), 'Sister Port');
  });
});

describe('metadataConfig Locations atlas columns', () => {
  it('splits default and optional column sets', () => {
    assert.deepEqual(getCategoryDefaultColumns('Locations'), [
      'Parent/Region',
      'Type',
      'Status',
      'Key Connections',
    ]);
    assert.ok(getCategoryOptionalColumns('Locations').includes('Population'));
    assert.ok(getCategoryOptionalColumns('Locations').includes('Map'));
  });

  it('merges selected optional keys into column defs', () => {
    const defs = getCategoryColumnDefs('Locations', ['Population', 'Map']);
    assert.deepEqual(
      defs.map((d) => d.key),
      [
        'Parent/Region',
        'Type',
        'Status',
        'Key Connections',
        'Population',
        'Map',
      ],
    );
    assert.equal(defs.find((d) => d.key === 'Map')?.optional, true);
  });

  it('normalizes snapshot optional keys', () => {
    assert.deepEqual(
      normalizeSelectedOptionalColumnKeys('Locations', ['Population', 'bogus']),
      ['Population'],
    );
  });
});

describe('categoryBrowseRegistry Locations defaults', () => {
  it('defaults to table with Type, Status, Region refine', () => {
    assert.equal(getCategoryDefaultView('Locations'), 'table');
    assert.deepEqual(getCategoryRefineFacetOrder('Locations'), [
      'Type',
      'Status',
      'Region',
      '__narrativeStatus',
    ]);
  });
});
