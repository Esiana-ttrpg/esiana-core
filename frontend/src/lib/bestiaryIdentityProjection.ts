import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export interface BestiaryIdentityProjection {
  displayName: string;
  identityLine: string;
  knownFor: string | null;
  portraitUrl: string | null;
  alsoKnownAs: string | null;
  threatLevel: string | null;
  region: string | null;
}

export type BestiaryIntelGroup =
  | 'region'
  | 'encounter'
  | 'threat'
  | 'temperament'
  | 'weaknesses'
  | 'resistances'
  | 'immunities'
  | 'activePeriods'
  | 'faction'
  | 'corruption'
  | 'behavior';

export type BestiaryIntelVisibility = 'hidden' | 'partial' | 'revealed';

export interface BestiaryIntelProjection {
  region: string | null;
  habitat: string | null;
  threatLevel: string | null;
  temperament: string | null;
  encounterConditions: string | null;
  encounterRate: string | null;
  activePeriods: string[];
  weaknesses: string[];
  resistances: string[];
  immunities: string[];
  factionAlignment: string | null;
  corruptionAffinity: string | null;
  behaviorSummary: string | null;
  intelligence: string | null;
  discoveryMask: Record<BestiaryIntelGroup, BestiaryIntelVisibility>;
  showSilhouette: boolean;
  unidentifiedLabel: string | null;
}

function findPage(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): WikiPageLineageSnapshot | null {
  return flatPages.find((page) => page.id === pageId) ?? null;
}

export function projectBestiaryIntelVisibility(
  discovery: DiscoveryStateProjection | null | undefined,
  isDMUser: boolean,
): Record<BestiaryIntelGroup, BestiaryIntelVisibility> {
  const revealed = (group: BestiaryIntelGroup): BestiaryIntelVisibility => {
    if (isDMUser) return 'revealed';
    const state = discovery?.state ?? 'known';
    if (state === 'known') return 'revealed';
    if (state === 'hidden') {
      return group === 'threat' ? 'partial' : 'hidden';
    }
    if (state === 'rumor') {
      if (group === 'region' || group === 'threat') return 'partial';
      return 'hidden';
    }
    if (state === 'partial') {
      if (
        group === 'region' ||
        group === 'encounter' ||
        group === 'threat' ||
        group === 'temperament' ||
        group === 'behavior'
      ) {
        return 'revealed';
      }
      return 'hidden';
    }
    if (state === 'contested') {
      if (group === 'weaknesses' || group === 'resistances' || group === 'immunities') {
        return 'partial';
      }
      return 'revealed';
    }
    return 'revealed';
  };

  const groups: BestiaryIntelGroup[] = [
    'region',
    'encounter',
    'threat',
    'temperament',
    'weaknesses',
    'resistances',
    'immunities',
    'activePeriods',
    'faction',
    'corruption',
    'behavior',
  ];

  return Object.fromEntries(
    groups.map((group) => [group, revealed(group)]),
  ) as Record<BestiaryIntelGroup, BestiaryIntelVisibility>;
}

export function buildBestiaryIdentityProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
): BestiaryIdentityProjection | null {
  const page = findPage(flatPages, pageId);
  if (!page) return null;

  const bestiary = parseBestiaryMetadata(page.metadata);
  const lineParts: string[] = [];
  if (bestiary.creatureType) lineParts.push(bestiary.creatureType);
  if (bestiary.habitat) lineParts.push(bestiary.habitat);
  else if (bestiary.region) lineParts.push(bestiary.region);

  return {
    displayName: page.title,
    identityLine: lineParts.join(' • '),
    knownFor: bestiary.knownFor,
    portraitUrl: bestiary.appearance.portraitUrl,
    alsoKnownAs: bestiary.alsoKnownAs,
    threatLevel: bestiary.threatLevel,
    region: bestiary.region,
  };
}

export function buildBestiaryIntelProjection(
  pageMetadata: unknown,
  discovery: DiscoveryStateProjection | null | undefined,
  isDMUser: boolean,
): BestiaryIntelProjection {
  const bestiary = parseBestiaryMetadata(pageMetadata);
  const discoveryMask = projectBestiaryIntelVisibility(discovery, isDMUser);
  const state = discovery?.state ?? 'known';
  const showSilhouette = !isDMUser && (state === 'hidden' || state === 'rumor');

  return {
    region: bestiary.region,
    habitat: bestiary.habitat,
    threatLevel: bestiary.threatLevel,
    temperament: bestiary.temperament,
    encounterConditions: bestiary.encounterConditions,
    encounterRate: bestiary.encounterRate,
    activePeriods: bestiary.activePeriods,
    weaknesses: bestiary.weaknesses,
    resistances: bestiary.resistances,
    immunities: bestiary.immunities,
    factionAlignment: bestiary.factionAlignment,
    corruptionAffinity: bestiary.corruptionAffinity,
    behaviorSummary: bestiary.behaviorSummary,
    intelligence: bestiary.intelligence,
    discoveryMask,
    showSilhouette,
    unidentifiedLabel:
      showSilhouette && !bestiary.creatureType
        ? 'Unidentified Aberration'
        : showSilhouette
          ? 'Unidentified Creature'
          : null,
  };
}

export function maskIntelValue(
  visibility: BestiaryIntelVisibility,
  value: string | string[] | null | undefined,
  unknownLabel = '???',
): string | null {
  if (visibility === 'hidden') return unknownLabel;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (visibility === 'partial') return `${value.length} noted`;
    return value.join(', ');
  }
  if (!value?.trim()) return null;
  if (visibility === 'partial' && value.length > 24) {
    return `${value.slice(0, 20).trim()}…`;
  }
  return value.trim();
}

export function resolveCreatureEnvironmentTint(
  habitat: string | null,
  region: string | null,
): 'frost' | 'swamp' | 'volcanic' | 'default' {
  const haystack = `${habitat ?? ''} ${region ?? ''}`.toLowerCase();
  if (/frost|snow|ice|winter|tundra|cold/.test(haystack)) return 'frost';
  if (/swamp|marsh|bog|mire|fen|wetland/.test(haystack)) return 'swamp';
  if (/volcan|lava|ash|fire|magma|ember/.test(haystack)) return 'volcanic';
  return 'default';
}
