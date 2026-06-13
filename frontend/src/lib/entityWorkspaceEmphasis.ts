import { parseAncestryMetadata } from '@/lib/ancestryMetadata';
import { formatPresenceExcerpt, buildAncestryPresenceProjection } from '@/lib/ancestryPresenceProjection';
import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { parseLocationMetadata } from '@/lib/locationMetadata';
import { parseObjectMetadata } from '@/lib/objectMetadata';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import { formatIndexLocationTrail } from '@/lib/wikiHierarchy';
import type { WikiTreeNode } from '@/types/wiki';

export interface EmphasisFactRow {
  label: string;
  value: string;
}

export interface EntityWorkspaceEmphasisContent {
  facts: EmphasisFactRow[];
  locationTrail: string | null;
  holderTitle: string | null;
  holderId: string | null;
  motivation: string | null;
  activeArc: string | null;
}

function pageTitle(
  snapshots: readonly WikiPageLineageSnapshot[],
  pageId: string | null | undefined,
): string | null {
  if (!pageId) return null;
  return snapshots.find((p) => p.id === pageId)?.title ?? null;
}

export function buildEntityWorkspaceEmphasis(
  surfaceKey: SurfaceProfileKey,
  pageId: string,
  pageMetadata: unknown,
  snapshots: readonly WikiPageLineageSnapshot[],
  flatPages: WikiTreeNode[],
): EntityWorkspaceEmphasisContent {
  const empty: EntityWorkspaceEmphasisContent = {
    facts: [],
    locationTrail: null,
    holderTitle: null,
    holderId: null,
    motivation: null,
    activeArc: null,
  };

  if (surfaceKey === 'character') {
    const identity = parseCharacterMetadata(pageMetadata);
    const facts: EmphasisFactRow[] = [];
    if (identity.motivation) facts.push({ label: 'Motivation', value: identity.motivation });
    if (identity.activeArc) facts.push({ label: 'Active arc', value: identity.activeArc });
    const locationTitle = pageTitle(snapshots, identity.currentLocationId);
    if (locationTitle) facts.push({ label: 'Location', value: locationTitle });
    return {
      ...empty,
      facts,
      motivation: identity.motivation,
      activeArc: identity.activeArc,
    };
  }

  if (surfaceKey === 'location') {
    const location = parseLocationMetadata(pageMetadata);
    const facts: EmphasisFactRow[] = [];
    if (location.locationType) facts.push({ label: 'Type', value: location.locationType });
    if (location.region) facts.push({ label: 'Region', value: location.region });
    if (location.climate) facts.push({ label: 'Climate', value: location.climate });
    if (location.rulerOrAuthority) {
      facts.push({ label: 'Authority', value: location.rulerOrAuthority });
    }
    if (location.dangerLevel !== null) {
      facts.push({ label: 'Danger', value: `${location.dangerLevel}/5` });
    }
    if (location.population) facts.push({ label: 'Population', value: location.population });

    const pageById = new Map(flatPages.map((p) => [p.id, p]));
    const self = pageById.get(pageId);
    const locationsRoot = flatPages.find((p) => p.title === 'Locations');
    const trail =
      self && locationsRoot
        ? formatIndexLocationTrail(self, locationsRoot.id, 'Locations', pageById)
        : null;

    return { ...empty, facts, locationTrail: trail };
  }

  if (surfaceKey === 'object') {
    const object = parseObjectMetadata(pageMetadata);
    const facts: EmphasisFactRow[] = [];
    if (object.provenance) facts.push({ label: 'Provenance', value: object.provenance });
    if (object.historicalSignificance) {
      facts.push({ label: 'Significance', value: object.historicalSignificance });
    }
    if (object.powersSummary) facts.push({ label: 'Powers', value: object.powersSummary });
    const holderTitle = pageTitle(snapshots, object.currentHolderId);
    return {
      ...empty,
      facts,
      holderTitle,
      holderId: object.currentHolderId,
    };
  }

  if (surfaceKey === 'bestiary') {
    const bestiary = parseBestiaryMetadata(pageMetadata);
    const facts: EmphasisFactRow[] = [];
    if (bestiary.creatureType) facts.push({ label: 'Type', value: bestiary.creatureType });
    if (bestiary.habitat) facts.push({ label: 'Habitat', value: bestiary.habitat });
    if (bestiary.threatLevel) facts.push({ label: 'Threat', value: bestiary.threatLevel });
    if (bestiary.intelligence) facts.push({ label: 'Intelligence', value: bestiary.intelligence });
    if (bestiary.temperament) facts.push({ label: 'Temperament', value: bestiary.temperament });
    if (bestiary.encounterConditions) {
      facts.push({ label: 'Encounter', value: bestiary.encounterConditions });
    }
    if (bestiary.weaknesses.length > 0) {
      facts.push({ label: 'Weak to', value: bestiary.weaknesses.join(', ') });
    }
    if (bestiary.behaviorSummary) {
      facts.push({ label: 'Behavior', value: bestiary.behaviorSummary });
    }
    return { ...empty, facts };
  }

  if (surfaceKey === 'ancestry') {
    const ancestry = parseAncestryMetadata(pageMetadata);
    const facts: EmphasisFactRow[] = [];
    if (ancestry.identitySummary) {
      facts.push({ label: 'Identity', value: ancestry.identitySummary });
    }
    const excerpt = formatPresenceExcerpt(
      buildAncestryPresenceProjection(pageId, flatPages),
    );
    if (excerpt) {
      facts.push({ label: 'Primarily found in', value: excerpt });
    } else if (ancestry.homeland) {
      facts.push({ label: 'Homeland', value: ancestry.homeland });
    }
    if (ancestry.knownFor) facts.push({ label: 'Known for', value: ancestry.knownFor });
    if (ancestry.societies.length > 0) {
      facts.push({
        label: 'Societies',
        value: String(ancestry.societies.length),
      });
    }
    return { ...empty, facts };
  }

  return empty;
}
