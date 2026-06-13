import {
  normalizeCodexAppearance,
  normalizePageIdList,
  readLegacyMetadataField,
  syncMetadataIndexFields,
  type CodexAppearanceFields,
} from './codexMetadataShared';
import {
  normalizeNullablePageId,
  normalizeNullableText,
  normalizeStringArray,
} from './entityRelationTypes';

export type AncestryEntityKind = 'root' | 'lineage' | 'hybrid' | 'constructed';

export type PopulationPresence =
  | 'widespread'
  | 'concentrated'
  | 'scattered'
  | 'isolated'
  | 'declining'
  | 'diaspora'
  | 'nomadic';

export const POPULATION_PRESENCE_VALUES: PopulationPresence[] = [
  'widespread',
  'concentrated',
  'scattered',
  'isolated',
  'declining',
  'diaspora',
  'nomadic',
];

export const ANCESTRY_ENTITY_KIND_LABELS: Record<AncestryEntityKind, string> = {
  root: 'Root Ancestry',
  lineage: 'Lineage',
  hybrid: 'Hybrid',
  constructed: 'Constructed',
};

export const POPULATION_PRESENCE_LABELS: Record<PopulationPresence, string> = {
  widespread: 'Widespread across many regions',
  concentrated: 'Concentrated in specific holds',
  scattered: 'Scattered in small communities',
  isolated: 'Isolated enclaves',
  declining: 'Declining populations',
  diaspora: 'Diaspora communities abroad',
  nomadic: 'Nomadic populations',
};

/** Diegetic UI labels for population distribution sections. */
export const ANCESTRY_PRESENCE_LABELS = {
  homelands: 'Primarily found in',
  communities: 'Smaller communities in',
  diaspora: 'Scattered presence in',
} as const;

export interface AncestrySociety {
  id: string;
  name: string;
  summary: string | null;
  customs: string | null;
  values: string | null;
  reputation: string | null;
  religion: string | null;
  relatedLocationIds: string[];
  relatedOrganizationIds: string[];
  associatedLineageIds: string[];
}

export interface AncestryMetadataFields {
  entityKind: AncestryEntityKind;
  parentAncestryId: string | null;
  secondaryParentAncestryId: string | null;
  identitySummary: string | null;
  ancestryType: string | null;
  homeland: string | null;
  region: string | null;
  knownFor: string | null;
  traditions: string | null;
  values: string | null;
  reputation: string | null;
  language: string | null;
  baselineTraits: string[];
  addedTraits: string[];
  suppressedTraits: string[];
  lifespanMin: number | null;
  lifespanMax: number | null;
  physiologyTags: string[];
  languageIds: string[];
  senses: string[];
  movementModes: string[];
  climateAdaptations: string[];
  homelandRegionIds: string[];
  communityRegionIds: string[];
  diasporaRegionIds: string[];
  populationPresence: PopulationPresence | null;
  appearance: CodexAppearanceFields;
  relatedAncestryIds: string[];
  relatedLocationIds: string[];
  relatedOrganizationIds: string[];
  societies: AncestrySociety[];
}

const ANCESTRY_METADATA_KEYS = [
  'entityKind',
  'parentAncestryId',
  'secondaryParentAncestryId',
  'identitySummary',
  'ancestryType',
  'homeland',
  'region',
  'knownFor',
  'traditions',
  'values',
  'reputation',
  'language',
  'baselineTraits',
  'addedTraits',
  'suppressedTraits',
  'lifespanMin',
  'lifespanMax',
  'physiologyTags',
  'languageIds',
  'senses',
  'movementModes',
  'climateAdaptations',
  'homelandRegionIds',
  'communityRegionIds',
  'diasporaRegionIds',
  'populationPresence',
  'appearance',
  'relatedAncestryIds',
  'relatedLocationIds',
  'relatedOrganizationIds',
  'societies',
] as const;

const EMPTY: AncestryMetadataFields = {
  entityKind: 'root',
  parentAncestryId: null,
  secondaryParentAncestryId: null,
  identitySummary: null,
  ancestryType: null,
  homeland: null,
  region: null,
  knownFor: null,
  traditions: null,
  values: null,
  reputation: null,
  language: null,
  baselineTraits: [],
  addedTraits: [],
  suppressedTraits: [],
  lifespanMin: null,
  lifespanMax: null,
  physiologyTags: [],
  languageIds: [],
  senses: [],
  movementModes: [],
  climateAdaptations: [],
  homelandRegionIds: [],
  communityRegionIds: [],
  diasporaRegionIds: [],
  populationPresence: null,
  appearance: { portraitUrl: null, portraitCredit: null, summary: null, tags: [] },
  relatedAncestryIds: [],
  relatedLocationIds: [],
  relatedOrganizationIds: [],
  societies: [],
};

function newSocietyId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `society-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeEntityKind(raw: unknown): AncestryEntityKind {
  if (raw === 'lineage' || raw === 'hybrid' || raw === 'constructed' || raw === 'root') {
    return raw;
  }
  return 'root';
}

function normalizePopulationPresence(raw: unknown): PopulationPresence | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return POPULATION_PRESENCE_VALUES.includes(value as PopulationPresence)
    ? (value as PopulationPresence)
    : null;
}

function normalizeNullableNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeSociety(raw: unknown): AncestrySociety | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const name = normalizeNullableText(record.name);
  if (!name) return null;
  const id =
    typeof record.id === 'string' && record.id.trim() ? record.id.trim() : newSocietyId();
  return {
    id,
    name,
    summary: normalizeNullableText(record.summary),
    customs: normalizeNullableText(record.customs),
    values: normalizeNullableText(record.values),
    reputation: normalizeNullableText(record.reputation),
    religion: normalizeNullableText(record.religion),
    relatedLocationIds: normalizePageIdList(record.relatedLocationIds),
    relatedOrganizationIds: normalizePageIdList(record.relatedOrganizationIds),
    associatedLineageIds: normalizePageIdList(record.associatedLineageIds),
  };
}

function normalizeSocieties(raw: unknown): AncestrySociety[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeSociety)
    .filter((s): s is AncestrySociety => s !== null);
}

function migrateLegacyCultureToSocieties(
  parsed: Omit<AncestryMetadataFields, 'societies'>,
  societies: AncestrySociety[],
): AncestrySociety[] {
  if (societies.length > 0) return societies;
  const hasLegacy =
    parsed.traditions?.trim() ||
    parsed.values?.trim() ||
    parsed.reputation?.trim();
  if (!hasLegacy) return [];
  return [
    {
      id: newSocietyId(),
      name: 'Traditional',
      summary: null,
      customs: parsed.traditions,
      values: parsed.values,
      reputation: parsed.reputation,
      religion: null,
      relatedLocationIds: [],
      relatedOrganizationIds: [],
      associatedLineageIds: [],
    },
  ];
}

export function parseAncestryMetadata(metadata: unknown): AncestryMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY, appearance: { ...EMPTY.appearance } };
  }
  const raw = metadata as Record<string, unknown>;
  const base = {
    entityKind: normalizeEntityKind(raw.entityKind),
    parentAncestryId: normalizeNullablePageId(raw.parentAncestryId),
    secondaryParentAncestryId: normalizeNullablePageId(raw.secondaryParentAncestryId),
    identitySummary: normalizeNullableText(raw.identitySummary),
    ancestryType:
      normalizeNullableText(raw.ancestryType) ?? readLegacyMetadataField(raw, 'Type'),
    homeland: normalizeNullableText(raw.homeland),
    region:
      normalizeNullableText(raw.region) ?? readLegacyMetadataField(raw, 'Region'),
    knownFor: normalizeNullableText(raw.knownFor),
    traditions: normalizeNullableText(raw.traditions),
    values: normalizeNullableText(raw.values),
    reputation: normalizeNullableText(raw.reputation),
    language: normalizeNullableText(raw.language),
    baselineTraits: normalizeStringArray(raw.baselineTraits),
    addedTraits: normalizeStringArray(raw.addedTraits),
    suppressedTraits: normalizeStringArray(raw.suppressedTraits),
    lifespanMin: normalizeNullableNumber(raw.lifespanMin),
    lifespanMax: normalizeNullableNumber(raw.lifespanMax),
    physiologyTags: normalizeStringArray(raw.physiologyTags),
    languageIds: normalizePageIdList(raw.languageIds),
    senses: normalizeStringArray(raw.senses),
    movementModes: normalizeStringArray(raw.movementModes),
    climateAdaptations: normalizeStringArray(raw.climateAdaptations),
    homelandRegionIds: normalizePageIdList(raw.homelandRegionIds),
    communityRegionIds: normalizePageIdList(raw.communityRegionIds),
    diasporaRegionIds: normalizePageIdList(raw.diasporaRegionIds),
    populationPresence: normalizePopulationPresence(raw.populationPresence),
    appearance: normalizeCodexAppearance(raw.appearance),
    relatedAncestryIds: normalizePageIdList(raw.relatedAncestryIds),
    relatedLocationIds: normalizePageIdList(raw.relatedLocationIds),
    relatedOrganizationIds: normalizePageIdList(raw.relatedOrganizationIds),
  };
  const societies = migrateLegacyCultureToSocieties(
    base,
    normalizeSocieties(raw.societies),
  );
  return { ...base, societies };
}

function syncIndex(
  metadata: Record<string, unknown>,
  ancestry: AncestryMetadataFields,
  options?: { resolvePageTitle?: (pageId: string) => string | null },
): void {
  const parentTitle =
    ancestry.parentAncestryId && options?.resolvePageTitle
      ? options.resolvePageTitle(ancestry.parentAncestryId) ?? ancestry.parentAncestryId
      : null;
  const homelandTitle =
    ancestry.homelandRegionIds[0] && options?.resolvePageTitle
      ? options.resolvePageTitle(ancestry.homelandRegionIds[0]) ??
        ancestry.homelandRegionIds[0]
      : ancestry.homeland;
  syncMetadataIndexFields(metadata, {
    Type: ancestry.ancestryType,
    Region: ancestry.region,
    Homeland: homelandTitle,
    Kind: ANCESTRY_ENTITY_KIND_LABELS[ancestry.entityKind],
    Parent: parentTitle,
    Population: ancestry.populationPresence,
    Reputation: ancestry.reputation ?? ancestry.societies[0]?.reputation ?? null,
  });
}

export function mergeAncestryMetadata(
  existing: unknown,
  patch: Partial<Omit<AncestryMetadataFields, 'appearance' | 'societies'>> & {
    appearance?: Partial<CodexAppearanceFields>;
    societies?: AncestrySociety[];
  },
  options?: { resolvePageTitle?: (pageId: string) => string | null },
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseAncestryMetadata(base);
  const merged: AncestryMetadataFields = {
    ...parsed,
    ...patch,
    appearance: patch.appearance
      ? { ...parsed.appearance, ...patch.appearance }
      : parsed.appearance,
    baselineTraits: patch.baselineTraits ?? parsed.baselineTraits,
    addedTraits: patch.addedTraits ?? parsed.addedTraits,
    suppressedTraits: patch.suppressedTraits ?? parsed.suppressedTraits,
    physiologyTags: patch.physiologyTags ?? parsed.physiologyTags,
    languageIds: patch.languageIds ?? parsed.languageIds,
    senses: patch.senses ?? parsed.senses,
    movementModes: patch.movementModes ?? parsed.movementModes,
    climateAdaptations: patch.climateAdaptations ?? parsed.climateAdaptations,
    homelandRegionIds: patch.homelandRegionIds ?? parsed.homelandRegionIds,
    communityRegionIds: patch.communityRegionIds ?? parsed.communityRegionIds,
    diasporaRegionIds: patch.diasporaRegionIds ?? parsed.diasporaRegionIds,
    relatedAncestryIds: patch.relatedAncestryIds ?? parsed.relatedAncestryIds,
    relatedLocationIds: patch.relatedLocationIds ?? parsed.relatedLocationIds,
    relatedOrganizationIds: patch.relatedOrganizationIds ?? parsed.relatedOrganizationIds,
    societies: patch.societies ?? parsed.societies,
  };
  const result: Record<string, unknown> = { ...base, ...merged };
  syncIndex(result, merged, options);
  return result;
}

export function hasAncestryMetadataPatch(body: Record<string, unknown>): boolean {
  return ANCESTRY_METADATA_KEYS.some((key) => key in body);
}

export function resolveAncestryMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasAncestryMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasAncestryMetadataPatch(body)) return body;
  return null;
}

export function buildAncestryMetadataPatch(
  input: Record<string, unknown>,
): Partial<AncestryMetadataFields> {
  const patch: Partial<AncestryMetadataFields> = {};
  for (const key of ANCESTRY_METADATA_KEYS) {
    if (key in input) {
      (patch as Record<string, unknown>)[key] = parseAncestryMetadata({ [key]: input[key] })[key];
    }
  }
  return patch;
}

export function pageTitleById(
  flatPages: { id: string; title: string }[],
  pageId: string | null,
): string | null {
  if (!pageId) return null;
  return flatPages.find((p) => p.id === pageId)?.title ?? null;
}

export function filterAncestryPagesByKind(
  flatPages: { id: string; metadata?: unknown }[],
  kind: AncestryEntityKind,
  excludePageId?: string,
): { id: string; metadata?: unknown }[] {
  return flatPages.filter((p) => {
    if (excludePageId && p.id === excludePageId) return false;
    const meta = parseAncestryMetadata(p.metadata);
    return meta.entityKind === kind;
  });
}
