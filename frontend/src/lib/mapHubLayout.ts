import type { CampaignMapAsset } from '@/types/maps';
import { mapDisplayTitle } from '@/types/maps';

export type MapsHubViewMode = 'compact' | 'expanded' | 'table';

export interface MapHubTableRow {
  map: CampaignMapAsset;
  /** Full path from root to this map (inclusive). */
  breadcrumb: { assetId: string; title: string }[];
  depth: number;
}

const VIEW_MODE_KEY = 'esiana-maps-hub-view';

export function readStoredMapsHubViewMode(): MapsHubViewMode {
  const stored = sessionStorage.getItem(VIEW_MODE_KEY);
  if (stored === 'expanded' || stored === 'table') return stored;
  if (stored === 'comfortable') return 'expanded';
  if (stored === 'list') return 'table';
  return 'compact';
}

export function writeStoredMapsHubViewMode(mode: MapsHubViewMode): void {
  sessionStorage.setItem(VIEW_MODE_KEY, mode);
}

/** Top-level maps only — excludes maps nested under another via pins. */
export function filterRootMapsForCompactHub(
  maps: CampaignMapAsset[],
): CampaignMapAsset[] {
  return maps.filter((map) => !(map.nestedInMaps?.length));
}

function buildMapLookup(maps: CampaignMapAsset[]): Map<string, CampaignMapAsset> {
  return new Map(maps.map((map) => [map.id, map]));
}

function resolvePrimaryParentId(map: CampaignMapAsset): string | null {
  return map.nestedInMaps?.[0]?.assetId ?? null;
}

/**
 * Depth-first table rows: each root, then its nested children in breadcrumb order.
 */
export function buildMapHubTableRows(maps: CampaignMapAsset[]): MapHubTableRow[] {
  const byId = buildMapLookup(maps);
  const childIds = new Set<string>();
  for (const map of maps) {
    if (map.nestedInMaps?.length) {
      childIds.add(map.id);
    }
  }

  const roots = maps
    .filter((map) => !childIds.has(map.id))
    .sort((a, b) => mapDisplayTitle(a).localeCompare(mapDisplayTitle(b)));

  const rows: MapHubTableRow[] = [];
  const visited = new Set<string>();

  function appendRow(
    map: CampaignMapAsset,
    breadcrumb: { assetId: string; title: string }[],
  ) {
    if (visited.has(map.id)) return;
    visited.add(map.id);
    rows.push({
      map,
      breadcrumb,
      depth: Math.max(0, breadcrumb.length - 1),
    });
  }

  function walkChildren(
    parent: CampaignMapAsset,
    ancestorTrail: { assetId: string; title: string }[],
  ) {
    const parentCrumb = {
      assetId: parent.id,
      title: mapDisplayTitle(parent),
    };
    const children = [...(parent.nestedChildMaps ?? [])].sort((a, b) =>
      a.title.localeCompare(b.title),
    );

    for (const childRef of children) {
      const child = byId.get(childRef.assetId);
      if (!child) continue;
      const breadcrumb = [...ancestorTrail, parentCrumb, {
        assetId: child.id,
        title: mapDisplayTitle(child),
      }];
      appendRow(child, breadcrumb);
      walkChildren(child, [...ancestorTrail, parentCrumb]);
    }
  }

  for (const root of roots) {
    const rootCrumb = { assetId: root.id, title: mapDisplayTitle(root) };
    appendRow(root, [rootCrumb]);
    walkChildren(root, []);
  }

  for (const map of maps) {
    if (visited.has(map.id)) continue;
    const breadcrumb = buildFallbackBreadcrumb(map, byId);
    appendRow(map, breadcrumb);
    walkChildren(map, breadcrumb.slice(0, -1));
  }

  return rows;
}

function buildFallbackBreadcrumb(
  map: CampaignMapAsset,
  byId: Map<string, CampaignMapAsset>,
): { assetId: string; title: string }[] {
  const chain: { assetId: string; title: string }[] = [];
  const seen = new Set<string>();
  let current: CampaignMapAsset | undefined = map;

  while (current) {
    const parentId = resolvePrimaryParentId(current);
    if (!parentId || seen.has(parentId)) break;
    seen.add(parentId);
    const parent = byId.get(parentId);
    const parentEntry = current.nestedInMaps?.find((e) => e.assetId === parentId);
    chain.unshift({
      assetId: parentId,
      title: parent
        ? mapDisplayTitle(parent)
        : parentEntry?.title ?? 'Parent map',
    });
    current = parent;
  }

  chain.push({ assetId: map.id, title: mapDisplayTitle(map) });
  return chain;
}

export function formatMapHubBreadcrumb(
  breadcrumb: { assetId: string; title: string }[],
): string {
  return breadcrumb.map((entry) => entry.title).join(' / ');
}
