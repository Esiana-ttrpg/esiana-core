import {
  isCharacterWikiPage,
  parseCharacterMetadata,
  resolveCharacterStatus,
  formatCharacterStatusLabel,
} from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { parseLocationMetadata } from '@/lib/locationMetadata';
import { readEntityCategoryFromMetadata } from '@shared/wikiTemplateType';
import type { CharacterLocationRole } from '@shared/characterLocationRelations';
import type { WikiTreeNode } from '@/types/wiki';
import {
  buildOrganizationsAtLocation,
  groupOrganizationsByPrimaryRole,
  type OrganizationAtLocation,
} from '@/lib/organizationLocationRelation';
import { buildLocationMapContexts, type LocationMapContextEntry } from '@/lib/locationMapContext';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';

export interface LocationPersonEntry {
  characterId: string;
  title: string;
  featured: boolean;
  role?: CharacterLocationRole;
  missingBadge?: boolean;
  groupEntityId?: string | null;
  groupEntityTitle?: string | null;
}

export interface LocationPeopleSections {
  featured: LocationPersonEntry[];
  residents: LocationPersonEntry[];
  visitors: LocationPersonEntry[];
  formerResidents: LocationPersonEntry[];
  lastSeenHere: LocationPersonEntry[];
}

export interface LocationPlaceGroup {
  label: string;
  places: Array<{ pageId: string; title: string; locationType: string | null }>;
}

export interface LocationConnectionsProjection {
  parentLocation: { pageId: string; title: string } | null;
  childLocations: Array<{ pageId: string; title: string }>;
  nearbyLocations: Array<{ pageId: string; title: string }>;
  politicalRegion: { pageId: string; title: string } | null;
}

export interface LocationHubProjection {
  people: LocationPeopleSections;
  places: LocationPlaceGroup[];
  organizations: ReturnType<typeof groupOrganizationsByPrimaryRole>;
  organizationsFlat: OrganizationAtLocation[];
  connections: LocationConnectionsProjection;
  mapContexts: LocationMapContextEntry[];
}

function pageTitle(flatPages: readonly WikiTreeNode[], pageId: string): string {
  return flatPages.find((p) => p.id === pageId)?.title ?? 'Unknown';
}

function isLocationPage(page: WikiTreeNode): boolean {
  return readEntityCategoryFromMetadata(page.metadata) === 'locations';
}

function normalizePlaceGroupLabel(locationType: string | null): string {
  if (!locationType?.trim()) return 'Other places';
  const trimmed = locationType.trim();
  const lower = trimmed.toLowerCase();
  const known: Record<string, string> = {
    tavern: 'Taverns',
    inn: 'Inns',
    temple: 'Temples',
    shop: 'Shops',
    district: 'Districts',
    estate: 'Estates',
    landmark: 'Landmarks',
    dungeon: 'Dungeons',
  };
  for (const [key, label] of Object.entries(known)) {
    if (lower.includes(key)) return label;
  }
  if (lower.endsWith('s')) return trimmed;
  return `${trimmed}s`;
}

function nestPeopleEntries(
  entries: LocationPersonEntry[],
  flatPages: readonly WikiTreeNode[],
): LocationPersonEntry[] {
  return entries;
}

export function buildLocationPeopleSections(
  locationPageId: string,
  flatPages: readonly WikiTreeNode[],
  campaignNow?: ChronologyDateParts,
): LocationPeopleSections {
  const featured: LocationPersonEntry[] = [];
  const residents: LocationPersonEntry[] = [];
  const visitors: LocationPersonEntry[] = [];
  const formerResidents: LocationPersonEntry[] = [];
  const lastSeenHere: LocationPersonEntry[] = [];

  for (const page of flatPages) {
    if (!isCharacterWikiPage(page)) continue;
    const identity = parseCharacterMetadata(page.metadata);
    const lineage = parseCharacterLineageMetadata(page.metadata);

    const status = resolveCharacterStatus(identity, lineage, campaignNow);
    if (
      status === 'MISSING' &&
      identity.currentLocationId === locationPageId
    ) {
      lastSeenHere.push({
        characterId: page.id,
        title: page.title,
        featured: false,
        missingBadge: true,
      });
    }

    for (const rel of identity.locationRelations) {
      if (rel.locationPageId !== locationPageId) continue;
      const entry: LocationPersonEntry = {
        characterId: page.id,
        title: page.title,
        featured: rel.featured === true,
        role: rel.role,
        groupEntityId: lineage.familyId ?? identity.primaryAffiliationId,
        groupEntityTitle: lineage.familyId
          ? pageTitle(flatPages, lineage.familyId)
          : identity.primaryAffiliationId
            ? pageTitle(flatPages, identity.primaryAffiliationId)
            : null,
      };
      if (rel.featured) featured.push(entry);
      if (rel.role === 'resident') residents.push(entry);
      if (rel.role === 'visitor') visitors.push(entry);
      if (rel.role === 'former') formerResidents.push(entry);
    }
  }

  const sortByTitle = (a: LocationPersonEntry, b: LocationPersonEntry) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

  featured.sort(sortByTitle);
  residents.sort(sortByTitle);
  visitors.sort(sortByTitle);
  formerResidents.sort(sortByTitle);
  lastSeenHere.sort(sortByTitle);

  return {
    featured: nestPeopleEntries(featured, flatPages),
    residents: nestPeopleEntries(residents, flatPages),
    visitors: nestPeopleEntries(visitors, flatPages),
    formerResidents: nestPeopleEntries(formerResidents, flatPages),
    lastSeenHere: nestPeopleEntries(lastSeenHere, flatPages),
  };
}

export function buildLocationPlaceGroups(
  locationPageId: string,
  flatPages: readonly WikiTreeNode[],
): LocationPlaceGroup[] {
  const children = flatPages.filter(
    (p) => p.parentId === locationPageId && isLocationPage(p),
  );
  const byLabel = new Map<string, LocationPlaceGroup['places']>();
  for (const child of children) {
    const meta = parseLocationMetadata(child.metadata);
    const label = normalizePlaceGroupLabel(meta.locationType);
    const list = byLabel.get(label) ?? [];
    list.push({
      pageId: child.id,
      title: child.title,
      locationType: meta.locationType,
    });
    byLabel.set(label, list);
  }
  const groups: LocationPlaceGroup[] = [...byLabel.entries()]
    .map(([label, places]) => ({
      label,
      places: places.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return groups;
}

export function buildLocationConnections(
  locationPageId: string,
  flatPages: readonly WikiTreeNode[],
  pageMetadata: unknown,
): LocationConnectionsProjection {
  const page = flatPages.find((p) => p.id === locationPageId);
  const meta = parseLocationMetadata(pageMetadata);
  let parentLocation: LocationConnectionsProjection['parentLocation'] = null;
  if (page?.parentId) {
    const parent = flatPages.find((p) => p.id === page.parentId);
    if (parent) {
      parentLocation = { pageId: parent.id, title: parent.title };
    }
  }

  const childLocations = flatPages
    .filter((p) => p.parentId === locationPageId && isLocationPage(p))
    .map((p) => ({ pageId: p.id, title: p.title }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  const nearbyLocations = meta.relatedLocationIds
    .map((id) => ({ pageId: id, title: pageTitle(flatPages, id) }))
    .filter((n) => n.title !== 'Unknown');

  const politicalRegion = meta.regionPageId
    ? {
        pageId: meta.regionPageId,
        title: pageTitle(flatPages, meta.regionPageId),
      }
    : null;

  return {
    parentLocation,
    childLocations,
    nearbyLocations,
    politicalRegion,
  };
}

export interface BuildLocationHubProjectionInput {
  campaignHandle: string;
  locationPageId: string;
  pageMetadata: unknown;
  flatPages: readonly WikiTreeNode[];
  mapAssetId?: string | null;
  campaignMaps?: Array<{ id: string; title: string }>;
  pinTargets?: Array<{ mapAssetId: string; pinId: string; label?: string | null }>;
  campaignNow?: ChronologyDateParts;
}

export function buildLocationHubProjection(
  input: BuildLocationHubProjectionInput,
): LocationHubProjection {
  const orgsFlat = buildOrganizationsAtLocation(input.locationPageId, input.flatPages);
  return {
    people: buildLocationPeopleSections(
      input.locationPageId,
      input.flatPages,
      input.campaignNow,
    ),
    places: buildLocationPlaceGroups(input.locationPageId, input.flatPages),
    organizations: groupOrganizationsByPrimaryRole(orgsFlat),
    organizationsFlat: orgsFlat,
    connections: buildLocationConnections(
      input.locationPageId,
      input.flatPages,
      input.pageMetadata,
    ),
    mapContexts: buildLocationMapContexts({
      campaignHandle: input.campaignHandle,
      locationPageId: input.locationPageId,
      pageMetadata: input.pageMetadata,
      mapAssetId: input.mapAssetId,
      campaignMaps: input.campaignMaps,
      pinTargets: input.pinTargets,
    }),
  };
}

export { formatCharacterStatusLabel };
