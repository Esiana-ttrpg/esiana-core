import { describe, expect, it } from 'vitest';
import {
  buildMapHubTableRows,
  filterRootMapsForCompactHub,
  formatMapHubBreadcrumb,
} from './mapHubLayout';
import type { CampaignMapAsset } from '@/types/maps';

function mockMap(
  id: string,
  title: string,
  opts: Partial<CampaignMapAsset> = {},
): CampaignMapAsset {
  return {
    id,
    url: '',
    displayUrl: null,
    thumbnailUrl: null,
    type: 'map',
    width: 1000,
    height: 800,
    originalWidth: null,
    originalHeight: null,
    displayName: title,
    createdAt: new Date().toISOString(),
    linkedPage: null,
    pinCount: 0,
    nestedInMaps: [],
    nestedChildMaps: [],
    ...opts,
  };
}

describe('filterRootMapsForCompactHub', () => {
  it('excludes maps nested under another map', () => {
    const world = mockMap('w', 'World');
    const city = mockMap('c', 'City', {
      nestedInMaps: [{ assetId: 'w', title: 'World' }],
    });
    expect(filterRootMapsForCompactHub([world, city])).toEqual([world]);
  });
});

describe('buildMapHubTableRows', () => {
  it('groups children under roots with breadcrumbs', () => {
    const world = mockMap('w', 'World', {
      nestedChildMaps: [{ assetId: 'n', title: 'Nation' }],
    });
    const nation = mockMap('n', 'Nation', {
      nestedInMaps: [{ assetId: 'w', title: 'World' }],
      nestedChildMaps: [{ assetId: 'c', title: 'City' }],
    });
    const city = mockMap('c', 'City', {
      nestedInMaps: [{ assetId: 'n', title: 'Nation' }],
    });

    const rows = buildMapHubTableRows([world, nation, city]);
    expect(rows.map((row) => row.map.id)).toEqual(['w', 'n', 'c']);
    expect(formatMapHubBreadcrumb(rows[2]!.breadcrumb)).toBe('World / Nation / City');
    expect(rows[2]!.depth).toBe(2);
  });
});
