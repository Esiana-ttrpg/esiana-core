import type { CategoryIndexChild } from '@/lib/wiki';
import {
  formatLocationKnownForDisplay,
  parseLocationMetadata,
  resolveLocationRegionLabel,
} from '@/lib/locationMetadata';
import { readCategoryMetadataField } from '@/lib/wikiMetadata';
import type { WikiTreeNode } from '@/types/wiki';

export interface LocationBrowseRow {
  parentRegionLabel: string | null;
  type: string | null;
  status: string | null;
  keyConnections: string | null;
  mapPresence: string | null;
  population: string | null;
  rulerOrAuthority: string | null;
  climate: string | null;
  threatsLabel: string | null;
  knownForLabel: string | null;
  relatedLocationsLabel: string | null;
  pathLabel: string | null;
  snippet: string | null;
}

export interface LocationBrowseProjectionContext {
  categoryPageId: string;
  allIndexChildren: CategoryIndexChild[];
  flatPages: ReadonlyArray<{ id: string; title: string }>;
  pageById: Map<string, WikiTreeNode>;
}

function resolvePageTitle(
  flatPages: ReadonlyArray<{ id: string; title: string }>,
  pageId: string,
): string | null {
  const page = flatPages.find((p) => p.id === pageId);
  const title = page?.title?.trim();
  return title ? title : null;
}

function countDirectIndexChildren(
  locationId: string,
  allIndexChildren: CategoryIndexChild[],
): number {
  return allIndexChildren.filter((child) => child.parentId === locationId).length;
}

function buildParentRegionLabel(
  child: CategoryIndexChild,
  ctx: LocationBrowseProjectionContext,
): string | null {
  const location = parseLocationMetadata(child.metadata);
  const regionPart = resolveLocationRegionLabel(location, ctx.flatPages);

  let parentPart: string | null = null;
  if (child.parentId && child.parentId !== ctx.categoryPageId) {
    const parent = ctx.pageById.get(child.parentId);
    if (parent?.title?.trim()) {
      parentPart = parent.title.trim();
    }
  }

  if (parentPart && regionPart) return `${parentPart} · ${regionPart}`;
  return parentPart ?? regionPart;
}

function buildKeyConnections(
  child: CategoryIndexChild,
  ctx: LocationBrowseProjectionContext,
): string | null {
  const childCount = countDirectIndexChildren(child.id, ctx.allIndexChildren);
  if (childCount > 0) {
    return `${childCount} place${childCount === 1 ? '' : 's'}`;
  }

  const location = parseLocationMetadata(child.metadata);
  for (const relatedId of location.relatedLocationIds) {
    const title = resolvePageTitle(ctx.flatPages, relatedId);
    if (title) return title;
  }
  return null;
}

function buildRelatedLocationsLabel(
  child: CategoryIndexChild,
  ctx: LocationBrowseProjectionContext,
  keyConnections: string | null,
): string | null {
  const location = parseLocationMetadata(child.metadata);
  const titles = location.relatedLocationIds
    .map((id) => resolvePageTitle(ctx.flatPages, id))
    .filter((title): title is string => Boolean(title));
  if (titles.length === 0) return null;

  if (
    keyConnections &&
    !/\d+ places?$/.test(keyConnections) &&
    titles.includes(keyConnections)
  ) {
    const rest = titles.filter((title) => title !== keyConnections);
    if (rest.length === 0) return null;
    return rest.join(', ');
  }
  return titles.join(', ');
}

function buildMapPresence(
  child: CategoryIndexChild,
  ctx: LocationBrowseProjectionContext,
): string | null {
  const location = parseLocationMetadata(child.metadata);
  if (!location.mapPageId) return null;
  return resolvePageTitle(ctx.flatPages, location.mapPageId) ?? 'Linked';
}

function resolveLocationStatus(child: CategoryIndexChild): string | null {
  const location = parseLocationMetadata(child.metadata);
  const fromField = readCategoryMetadataField(child.metadata, 'Status');
  const value = location.currentStatus ?? fromField;
  return value?.trim() ? value.trim() : null;
}

export function buildLocationBrowseRow(
  child: CategoryIndexChild,
  ctx: LocationBrowseProjectionContext,
): LocationBrowseRow {
  const location = parseLocationMetadata(child.metadata);
  const keyConnections = buildKeyConnections(child, ctx);
  const threatsLabel =
    location.threats.length > 0 ? location.threats.join(', ') : null;

  return {
    parentRegionLabel: buildParentRegionLabel(child, ctx),
    type: location.locationType,
    status: resolveLocationStatus(child),
    keyConnections,
    mapPresence: buildMapPresence(child, ctx),
    population: location.population,
    rulerOrAuthority: location.rulerOrAuthority,
    climate: location.climate,
    threatsLabel,
    knownForLabel: formatLocationKnownForDisplay(location.knownFor),
    relatedLocationsLabel: buildRelatedLocationsLabel(child, ctx, keyConnections),
    pathLabel: child.locationTrailLabel ?? null,
    snippet: child.snippet?.trim() ? child.snippet.trim() : null,
  };
}

export function readLocationBrowseCell(
  row: LocationBrowseRow,
  columnKey: string,
): string | null {
  switch (columnKey) {
    case 'Parent/Region':
      return row.parentRegionLabel;
    case 'Type':
      return row.type;
    case 'Status':
      return row.status;
    case 'Key Connections':
      return row.keyConnections;
    case 'Population':
      return row.population;
    case 'Ruler':
      return row.rulerOrAuthority;
    case 'Climate':
      return row.climate;
    case 'Threats':
      return row.threatsLabel;
    case 'Map':
      return row.mapPresence;
    case 'Known for':
      return row.knownForLabel;
    case 'Related locations':
      return row.relatedLocationsLabel;
    default:
      return null;
  }
}

export function buildLocationBrowseRowMap(
  children: CategoryIndexChild[],
  ctx: LocationBrowseProjectionContext,
): Map<string, LocationBrowseRow> {
  const map = new Map<string, LocationBrowseRow>();
  for (const child of children) {
    map.set(child.id, buildLocationBrowseRow(child, ctx));
  }
  return map;
}
