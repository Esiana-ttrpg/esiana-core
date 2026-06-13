import {
  ANCESTRY_PRESENCE_LABELS,
  parseAncestryMetadata,
  POPULATION_PRESENCE_LABELS,
  type PopulationPresence,
} from './ancestryMetadata';
import { buildAncestryInheritanceProjection } from './ancestryInheritanceProjection';
import type { AncestryPageRef } from './ancestryInheritanceProjection';
import type { WikiTreeNode } from '@/types/wiki';

export interface PresenceLocationRef {
  pageId: string;
  title: string;
}

export interface AncestryPresenceSection {
  label: string;
  locations: PresenceLocationRef[];
}

export interface AncestryPresenceProjection {
  sections: AncestryPresenceSection[];
  populationPresence: PopulationPresence | null;
  populationPresenceLabel: string | null;
  legacyHomeland: string | null;
  legacyRegion: string | null;
  campaignInferred: PresenceLocationRef[];
}

function resolveLocationRefs(
  flatPages: AncestryPageRef[],
  pageIds: string[],
): PresenceLocationRef[] {
  return pageIds.map((pageId) => ({
    pageId,
    title: flatPages.find((p) => p.id === pageId)?.title ?? pageId,
  }));
}

function mergeRegionIds(
  pageId: string,
  flatPages: AncestryPageRef[],
  field: 'homelandRegionIds' | 'communityRegionIds' | 'diasporaRegionIds',
): string[] {
  const projection = buildAncestryInheritanceProjection(pageId, flatPages);
  const current = parseAncestryMetadata(
    flatPages.find((p) => p.id === pageId)?.metadata,
  );
  const ids = new Set<string>(current[field]);
  for (const node of projection.parentChain.slice(0, -1)) {
    for (const id of node.metadata[field]) {
      if (!ids.size) ids.add(id);
    }
  }
  if (ids.size === 0) {
    for (const node of projection.parentChain) {
      for (const id of node.metadata[field]) {
        ids.add(id);
      }
    }
  }
  return [...ids];
}

export function buildAncestryPresenceProjection(
  pageId: string,
  flatPages: AncestryPageRef[],
  options?: {
    campaignCharacterLocationIds?: string[];
  },
): AncestryPresenceProjection {
  const meta = parseAncestryMetadata(
    flatPages.find((p) => p.id === pageId)?.metadata,
  );

  const homelandIds = mergeRegionIds(pageId, flatPages, 'homelandRegionIds');
  const communityIds = mergeRegionIds(pageId, flatPages, 'communityRegionIds');
  const diasporaIds = mergeRegionIds(pageId, flatPages, 'diasporaRegionIds');

  const sections: AncestryPresenceSection[] = [];
  if (homelandIds.length > 0) {
    sections.push({
      label: ANCESTRY_PRESENCE_LABELS.homelands,
      locations: resolveLocationRefs(flatPages, homelandIds),
    });
  }
  if (communityIds.length > 0) {
    sections.push({
      label: ANCESTRY_PRESENCE_LABELS.communities,
      locations: resolveLocationRefs(flatPages, communityIds),
    });
  }
  if (diasporaIds.length > 0) {
    sections.push({
      label: ANCESTRY_PRESENCE_LABELS.diaspora,
      locations: resolveLocationRefs(flatPages, diasporaIds),
    });
  }

  const campaignInferred = resolveLocationRefs(
    flatPages,
    options?.campaignCharacterLocationIds ?? [],
  ).filter(
    (loc) =>
      !homelandIds.includes(loc.pageId) &&
      !communityIds.includes(loc.pageId) &&
      !diasporaIds.includes(loc.pageId),
  );

  return {
    sections,
    populationPresence: meta.populationPresence,
    populationPresenceLabel: meta.populationPresence
      ? POPULATION_PRESENCE_LABELS[meta.populationPresence]
      : null,
    legacyHomeland: meta.homeland,
    legacyRegion: meta.region,
    campaignInferred,
  };
}

export function formatPresenceExcerpt(
  projection: AncestryPresenceProjection,
  maxLocations = 3,
): string | null {
  const primary = projection.sections[0];
  if (!primary || primary.locations.length === 0) {
    return projection.legacyHomeland ?? projection.legacyRegion ?? null;
  }
  const names = primary.locations.slice(0, maxLocations).map((l) => l.title);
  const suffix =
    primary.locations.length > maxLocations
      ? ` +${primary.locations.length - maxLocations} more`
      : '';
  return `${names.join(' · ')}${suffix}`;
}
