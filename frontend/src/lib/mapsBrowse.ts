import type { CampaignMapAsset } from '@/types/maps';
import { mapDisplayTitle } from '@/types/maps';
import {
  buildGenericHierarchyForest,
  type CodexHierarchyItem,
} from '@/lib/codexHierarchy';

export type MapsBrowseViewMode = 'card' | 'table' | 'hierarchy';

export interface MapHierarchyNode {
  id: string;
  title: string;
  map: CampaignMapAsset;
  children: MapHierarchyNode[];
}

function mapToHierarchyItem(map: CampaignMapAsset): CodexHierarchyItem {
  return {
    id: map.id,
    title: mapDisplayTitle(map),
    parentId: map.nestedInMaps?.[0]?.assetId ?? null,
  };
}

function resolveMapParentId(map: CampaignMapAsset): string | null {
  return map.nestedInMaps?.[0]?.assetId ?? null;
}

export function buildMapHierarchyForest(
  filteredMaps: CampaignMapAsset[],
): MapHierarchyNode[] {
  const generic = buildGenericHierarchyForest(
    filteredMaps.map(mapToHierarchyItem),
    (item) => item.parentId,
  );

  const mapById = new Map(filteredMaps.map((m) => [m.id, m]));

  type GenericNode = (typeof generic)[number];

  function convert(node: GenericNode): MapHierarchyNode {
    const map = mapById.get(node.item.id)!;
    return {
      id: node.item.id,
      title: node.item.title,
      map,
      children: node.children.map(convert),
    };
  }

  return generic.map(convert);
}

export function defaultMapHierarchyExpandedIds(
  forest: MapHierarchyNode[],
): Set<string> {
  const ids = new Set<string>();
  for (const root of forest) {
    ids.add(root.id);
    for (const child of root.children) {
      ids.add(child.id);
    }
  }
  return ids;
}

export function buildMapSearchHaystack(map: CampaignMapAsset): string {
  const parts = [mapDisplayTitle(map), map.type];
  if (map.linkedPage?.title) parts.push(map.linkedPage.title);
  return parts
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
}

export function filterMapsBySearch(
  maps: CampaignMapAsset[],
  query: string,
): CampaignMapAsset[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return maps;
  return maps.filter((map) => buildMapSearchHaystack(map).includes(normalized));
}

export function buildMapParentTrailLabel(
  map: CampaignMapAsset,
  allMaps: CampaignMapAsset[],
): string | null {
  const byId = new Map(allMaps.map((m) => [m.id, m]));
  const chain: string[] = [];
  const seen = new Set<string>();
  let parentId = resolveMapParentId(map);

  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) {
      const entry = map.nestedInMaps?.find((e) => e.assetId === parentId);
      if (entry) chain.unshift(entry.title);
      break;
    }
    chain.unshift(mapDisplayTitle(parent));
    parentId = resolveMapParentId(parent);
  }

  if (chain.length === 0) return null;
  return chain.join(' › ');
}

export function flattenMapHierarchy(
  forest: MapHierarchyNode[],
  expandedIds: Set<string>,
  allMaps: CampaignMapAsset[],
): Array<{
  node: MapHierarchyNode;
  depth: number;
  hasChildren: boolean;
  parentTrailLabel: string | null;
}> {
  const rows: Array<{
    node: MapHierarchyNode;
    depth: number;
    hasChildren: boolean;
    parentTrailLabel: string | null;
  }> = [];

  function walk(node: MapHierarchyNode, depth: number) {
    const hasChildren = node.children.length > 0;
    rows.push({
      node,
      depth,
      hasChildren,
      parentTrailLabel: buildMapParentTrailLabel(node.map, allMaps),
    });
    if (hasChildren && expandedIds.has(node.id)) {
      for (const child of node.children) {
        walk(child, depth + 1);
      }
    }
  }

  for (const root of forest) {
    walk(root, 0);
  }
  return rows;
}
