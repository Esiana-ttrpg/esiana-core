import {
  normalizeFactionEraTrajectories,
  type FactionEraTrajectory,
} from '@shared/factionMomentumMetadata';
import {
  normalizePageIdList,
  readLegacyMetadataField,
  syncMetadataIndexFields,
} from './codexMetadataShared';

export type { FactionEraTrajectory };
import {
  type ChronologyDateParts,
  type CitationHooks,
  type IdentifiableRecord,
  type OrgRelationCategory,
  type OrgRelationStance,
  type RelationVisibility,
  compareDateParts,
  dateSortKey,
  normalizeChronologyDate,
  normalizeNullablePageId,
  normalizeNullableText,
  normalizeOrgRelationCategory,
  normalizeOrgRelationStance,
  normalizeRecordId,
  normalizeRelationVisibility,
  normalizeStringArray,
} from './entityRelationTypes';

export interface OrganizationRelationEvent extends IdentifiableRecord, CitationHooks {
  effectiveDate: ChronologyDateParts;
  relationType: OrgRelationCategory;
  stance: OrgRelationStance;
  visibility: RelationVisibility;
}

export interface OrganizationRelation extends IdentifiableRecord {
  targetOrgId: string;
  history: OrganizationRelationEvent[];
}

export type OrganizationStatus =
  | 'ACTIVE'
  | 'DISSOLVED'
  | 'MERGED'
  | 'RENAMED';

export const ORGANIZATION_STATUSES: OrganizationStatus[] = [
  'ACTIVE',
  'DISSOLVED',
  'MERGED',
  'RENAMED',
];

export type OrganizationWorldState =
  | 'rising'
  | 'fragmented'
  | 'dormant'
  | 'expanding'
  | 'schismatic'
  | 'occupied'
  | 'exiled'
  | 'corrupt'
  | 'reforming'
  | 'declining';

export const ORGANIZATION_WORLD_STATES: OrganizationWorldState[] = [
  'rising',
  'fragmented',
  'dormant',
  'expanding',
  'schismatic',
  'occupied',
  'exiled',
  'corrupt',
  'reforming',
  'declining',
];

export const ORGANIZATION_WORLD_STATE_LABELS: Record<OrganizationWorldState, string> = {
  rising: 'Rising',
  fragmented: 'Fragmented',
  dormant: 'Dormant',
  expanding: 'Expanding',
  schismatic: 'Schismatic',
  occupied: 'Occupied',
  exiled: 'Exiled',
  corrupt: 'Corrupt',
  reforming: 'Reforming',
  declining: 'Declining',
};

export type OperationalScale =
  | 'local'
  | 'regional'
  | 'continental'
  | 'shadow'
  | 'fragmented';

export const OPERATIONAL_SCALES: OperationalScale[] = [
  'local',
  'regional',
  'continental',
  'shadow',
  'fragmented',
];

export const OPERATIONAL_SCALE_LABELS: Record<OperationalScale, string> = {
  local: 'Local power',
  regional: 'Regional power',
  continental: 'Continental power',
  shadow: 'Shadow network',
  fragmented: 'Fragmented reach',
};

export type InfluenceMode =
  | 'mercantile'
  | 'military'
  | 'religious'
  | 'covert'
  | 'political'
  | 'scholarly'
  | 'criminal';

export const INFLUENCE_MODES: InfluenceMode[] = [
  'mercantile',
  'military',
  'religious',
  'covert',
  'political',
  'scholarly',
  'criminal',
];

export const INFLUENCE_MODE_LABELS: Record<InfluenceMode, string> = {
  mercantile: 'Mercantile',
  military: 'Military',
  religious: 'Religious',
  covert: 'Covert',
  political: 'Political',
  scholarly: 'Scholarly',
  criminal: 'Criminal',
};

export type OrganizationalVisibility = 'public' | 'quiet' | 'secret' | 'mythic';

export const ORGANIZATIONAL_VISIBILITIES: OrganizationalVisibility[] = [
  'public',
  'quiet',
  'secret',
  'mythic',
];

export const ORGANIZATIONAL_VISIBILITY_LABELS: Record<OrganizationalVisibility, string> = {
  public: 'Publicly known',
  quiet: 'Quietly known',
  secret: 'Secret',
  mythic: 'Mythic / legendary',
};

export type StructuralRole =
  | 'chapter'
  | 'ministry'
  | 'house'
  | 'division'
  | 'branch'
  | 'council'
  | 'order'
  | 'subsidiary'
  | 'cell'
  | 'office';

export const STRUCTURAL_ROLES: StructuralRole[] = [
  'chapter',
  'ministry',
  'house',
  'division',
  'branch',
  'council',
  'order',
  'subsidiary',
  'cell',
  'office',
];

export const STRUCTURAL_ROLE_LABELS: Record<StructuralRole, string> = {
  chapter: 'Chapter',
  ministry: 'Ministry',
  house: 'House',
  division: 'Division',
  branch: 'Branch',
  council: 'Council',
  order: 'Order',
  subsidiary: 'Subsidiary',
  cell: 'Cell',
  office: 'Office',
};

export type OrganizationSymbolPreset =
  | 'crescent'
  | 'coin'
  | 'spear'
  | 'tome'
  | 'banner'
  | 'crown'
  | 'scale'
  | 'flame'
  | 'wave'
  | 'eye'
  | 'rose'
  | 'skull';

export const ORGANIZATION_SYMBOL_PRESETS: OrganizationSymbolPreset[] = [
  'crescent',
  'coin',
  'spear',
  'tome',
  'banner',
  'crown',
  'scale',
  'flame',
  'wave',
  'eye',
  'rose',
  'skull',
];

export const MAX_CURRENT_PRESSURES = 5;

export interface OrganizationMetadataFields {
  orgType: string | null;
  motto: string | null;
  motivation: string | null;
  publicPurpose: string | null;
  privateAgenda: string | null;
  leaderId: string | null;
  headquartersId: string | null;
  /** Structural membership in a parent institution — not alliance or secret control. */
  parentOrgId: string | null;
  region: string | null;
  relations: OrganizationRelation[];
  organizationStatus: OrganizationStatus;
  statusEffectiveDate: ChronologyDateParts | null;
  statusReason: string | null;
  worldState: OrganizationWorldState | null;
  currentPressures: string[];
  operationalScale: OperationalScale | null;
  methods: string | null;
  publicReputation: string | null;
  influenceMode: InfluenceMode | null;
  organizationalVisibility: OrganizationalVisibility | null;
  structuralRole: StructuralRole | null;
  symbolPreset: OrganizationSymbolPreset | null;
  doctrineTint: string | null;
  /** Campaign asset id for uploaded crest / shield / logo. */
  emblemAssetId: string | null;
  strongholdLocationIds: string[];
  influenceRegionIds: string[];
  activeTerritoryIds: string[];
  hiddenEnclaveIds: string[];
  tradeReachRegionIds: string[];
  contestedZoneIds: string[];
  eraTrajectories: FactionEraTrajectory[];
}

const ORG_METADATA_KEYS = [
  'orgType',
  'motto',
  'motivation',
  'publicPurpose',
  'privateAgenda',
  'leaderId',
  'headquartersId',
  'parentOrgId',
  'region',
  'relations',
  'organizationStatus',
  'statusEffectiveDate',
  'statusReason',
  'worldState',
  'currentPressures',
  'operationalScale',
  'methods',
  'publicReputation',
  'influenceMode',
  'organizationalVisibility',
  'structuralRole',
  'symbolPreset',
  'doctrineTint',
  'emblemAssetId',
  'strongholdLocationIds',
  'influenceRegionIds',
  'activeTerritoryIds',
  'hiddenEnclaveIds',
  'tradeReachRegionIds',
  'contestedZoneIds',
  'eraTrajectories',
] as const;

const EMPTY_ORG: OrganizationMetadataFields = {
  orgType: null,
  motto: null,
  motivation: null,
  publicPurpose: null,
  privateAgenda: null,
  leaderId: null,
  headquartersId: null,
  parentOrgId: null,
  region: null,
  relations: [],
  organizationStatus: 'ACTIVE',
  statusEffectiveDate: null,
  statusReason: null,
  worldState: null,
  currentPressures: [],
  operationalScale: null,
  methods: null,
  publicReputation: null,
  influenceMode: null,
  organizationalVisibility: null,
  structuralRole: null,
  symbolPreset: null,
  doctrineTint: null,
  emblemAssetId: null,
  strongholdLocationIds: [],
  influenceRegionIds: [],
  activeTerritoryIds: [],
  hiddenEnclaveIds: [],
  tradeReachRegionIds: [],
  contestedZoneIds: [],
  eraTrajectories: [],
};

function normalizeEnum<T extends string>(
  raw: unknown,
  values: readonly T[],
): T | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return (values as readonly string[]).includes(lower) ? (lower as T) : null;
}

function normalizeDoctrineTint(raw: unknown): string | null {
  const text = normalizeNullableText(raw);
  if (!text) return null;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(text)) return text;
  return null;
}

function normalizeCurrentPressures(raw: unknown): string[] {
  const items = normalizeStringArray(raw)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.slice(0, MAX_CURRENT_PRESSURES);
}

export function normalizeOrganizationStatus(raw: unknown): OrganizationStatus {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((ORGANIZATION_STATUSES as readonly string[]).includes(upper)) {
      return upper as OrganizationStatus;
    }
  }
  return 'ACTIVE';
}

function normalizeRelationEvent(raw: unknown): OrganizationRelationEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const effectiveDate = normalizeChronologyDate(obj.effectiveDate);
  if (!effectiveDate) return null;
  return {
    id: normalizeRecordId(obj.id),
    effectiveDate,
    relationType: normalizeOrgRelationCategory(obj.relationType),
    stance: normalizeOrgRelationStance(obj.stance),
    visibility: normalizeRelationVisibility(obj.visibility),
    note: normalizeNullableText(obj.note),
    sourcePageIds: normalizeStringArray(obj.sourcePageIds),
    sourceEventIds: normalizeStringArray(obj.sourceEventIds),
  };
}

function normalizeOrganizationRelation(raw: unknown): OrganizationRelation | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const targetOrgId = normalizeNullablePageId(obj.targetOrgId);
  if (!targetOrgId) return null;
  const historyRaw = Array.isArray(obj.history) ? obj.history : [];
  const history = historyRaw
    .map(normalizeRelationEvent)
    .filter((event): event is OrganizationRelationEvent => event !== null)
    .sort((a, b) => compareDateParts(a.effectiveDate, b.effectiveDate));
  return {
    id: normalizeRecordId(obj.id),
    targetOrgId,
    history,
  };
}

function resolvePublicPurpose(raw: Record<string, unknown>): string | null {
  return (
    normalizeNullableText(raw.publicPurpose) ??
    normalizeNullableText(raw.motivation) ??
    readLegacyMetadataField(raw, 'Motivation')
  );
}

export function parseOrganizationMetadata(metadata: unknown): OrganizationMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY_ORG };
  }
  const raw = metadata as Record<string, unknown>;
  const relationsRaw = Array.isArray(raw.relations) ? raw.relations : [];
  const relations = relationsRaw
    .map(normalizeOrganizationRelation)
    .filter((rel): rel is OrganizationRelation => rel !== null);
  const publicPurpose = resolvePublicPurpose(raw);

  return {
    orgType: normalizeNullableText(raw.orgType) ?? readLegacyMetadataField(raw, 'Type'),
    motto: normalizeNullableText(raw.motto),
    motivation: publicPurpose,
    publicPurpose,
    privateAgenda: normalizeNullableText(raw.privateAgenda),
    leaderId: normalizeNullablePageId(raw.leaderId),
    headquartersId: normalizeNullablePageId(raw.headquartersId),
    parentOrgId: normalizeNullablePageId(raw.parentOrgId),
    region: normalizeNullableText(raw.region) ?? readLegacyMetadataField(raw, 'Region'),
    relations,
    organizationStatus: normalizeOrganizationStatus(raw.organizationStatus),
    statusEffectiveDate: normalizeChronologyDate(raw.statusEffectiveDate),
    statusReason: normalizeNullableText(raw.statusReason),
    worldState: normalizeEnum(raw.worldState, ORGANIZATION_WORLD_STATES),
    currentPressures: normalizeCurrentPressures(raw.currentPressures),
    operationalScale: normalizeEnum(raw.operationalScale, OPERATIONAL_SCALES),
    methods: normalizeNullableText(raw.methods),
    publicReputation: normalizeNullableText(raw.publicReputation),
    influenceMode: normalizeEnum(raw.influenceMode, INFLUENCE_MODES),
    organizationalVisibility: normalizeEnum(
      raw.organizationalVisibility,
      ORGANIZATIONAL_VISIBILITIES,
    ),
    structuralRole: normalizeEnum(raw.structuralRole, STRUCTURAL_ROLES),
    symbolPreset: normalizeEnum(raw.symbolPreset, ORGANIZATION_SYMBOL_PRESETS),
    doctrineTint: normalizeDoctrineTint(raw.doctrineTint),
    emblemAssetId: normalizeNullablePageId(raw.emblemAssetId),
    strongholdLocationIds: normalizePageIdList(raw.strongholdLocationIds),
    influenceRegionIds: normalizePageIdList(raw.influenceRegionIds),
    activeTerritoryIds: normalizePageIdList(raw.activeTerritoryIds),
    hiddenEnclaveIds: normalizePageIdList(raw.hiddenEnclaveIds),
    tradeReachRegionIds: normalizePageIdList(raw.tradeReachRegionIds),
    contestedZoneIds: normalizePageIdList(raw.contestedZoneIds),
    eraTrajectories: normalizeFactionEraTrajectories(raw.eraTrajectories),
  };
}

export function isOrganizationMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return ORG_METADATA_KEYS.some((key) => {
    const value = raw[key];
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}

function syncOrganizationIndexFields(
  metadata: Record<string, unknown>,
  org: OrganizationMetadataFields,
  resolvePageTitle?: (pageId: string) => string | null,
): void {
  const parentLabel =
    org.parentOrgId && resolvePageTitle
      ? resolvePageTitle(org.parentOrgId) ?? org.parentOrgId
      : org.parentOrgId;

  syncMetadataIndexFields(metadata, {
    Type: org.orgType,
    Region: org.region,
    Parent: parentLabel,
    Motivation: org.publicPurpose ?? org.motivation,
    'World State': org.worldState
      ? ORGANIZATION_WORLD_STATE_LABELS[org.worldState]
      : null,
    Scale: org.operationalScale
      ? OPERATIONAL_SCALE_LABELS[org.operationalScale]
      : null,
    Visibility: org.organizationalVisibility
      ? ORGANIZATIONAL_VISIBILITY_LABELS[org.organizationalVisibility]
      : null,
  });
}

export function mergeOrganizationMetadata(
  existing: unknown,
  patch: Partial<OrganizationMetadataFields>,
  options?: { resolvePageTitle?: (pageId: string) => string | null },
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseOrganizationMetadata(base);
  const merged: OrganizationMetadataFields = { ...parsed, ...patch };
  if (patch.publicPurpose !== undefined) {
    merged.motivation = patch.publicPurpose;
  } else if (patch.motivation !== undefined) {
    merged.publicPurpose = patch.motivation;
    merged.motivation = patch.motivation;
  }
  const result: Record<string, unknown> = {
    ...base,
    orgType: merged.orgType,
    motto: merged.motto,
    motivation: merged.publicPurpose ?? merged.motivation,
    publicPurpose: merged.publicPurpose,
    privateAgenda: merged.privateAgenda,
    leaderId: merged.leaderId,
    headquartersId: merged.headquartersId,
    parentOrgId: merged.parentOrgId,
    region: merged.region,
    relations: merged.relations,
    organizationStatus: merged.organizationStatus,
    statusEffectiveDate: merged.statusEffectiveDate,
    statusReason: merged.statusReason,
    worldState: merged.worldState,
    currentPressures: merged.currentPressures,
    operationalScale: merged.operationalScale,
    methods: merged.methods,
    publicReputation: merged.publicReputation,
    influenceMode: merged.influenceMode,
    organizationalVisibility: merged.organizationalVisibility,
    structuralRole: merged.structuralRole,
    symbolPreset: merged.symbolPreset,
    doctrineTint: merged.doctrineTint,
    emblemAssetId: merged.emblemAssetId,
    strongholdLocationIds: merged.strongholdLocationIds,
    influenceRegionIds: merged.influenceRegionIds,
    activeTerritoryIds: merged.activeTerritoryIds,
    hiddenEnclaveIds: merged.hiddenEnclaveIds,
    tradeReachRegionIds: merged.tradeReachRegionIds,
    contestedZoneIds: merged.contestedZoneIds,
    eraTrajectories: merged.eraTrajectories,
  };
  syncOrganizationIndexFields(result, merged, options?.resolvePageTitle);
  return result;
}

export function resolveOrgStanceAt(
  relation: OrganizationRelation,
  date: ChronologyDateParts,
  relationType?: OrgRelationCategory,
): OrganizationRelationEvent | null {
  const queryKey = dateSortKey(date);
  let best: OrganizationRelationEvent | null = null;
  let bestKey = Number.NEGATIVE_INFINITY;
  for (const event of relation.history) {
    if (relationType && event.relationType !== relationType) continue;
    const eventKey = dateSortKey(event.effectiveDate);
    if (eventKey <= queryKey && eventKey >= bestKey) {
      best = event;
      bestKey = eventKey;
    }
  }
  return best;
}

export function resolveOrgRelationsAt(
  org: OrganizationMetadataFields,
  date: ChronologyDateParts,
): Array<{
  relation: OrganizationRelation;
  event: OrganizationRelationEvent;
}> {
  const out: Array<{ relation: OrganizationRelation; event: OrganizationRelationEvent }> =
    [];
  for (const relation of org.relations) {
    const event = resolveOrgStanceAt(relation, date);
    if (event) out.push({ relation, event });
  }
  return out;
}

export function hasOrganizationMetadataPatch(body: Record<string, unknown>): boolean {
  return ORG_METADATA_KEYS.some((key) => key in body);
}

export function resolveOrganizationMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasOrganizationMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasOrganizationMetadataPatch(body)) {
    return body;
  }
  return null;
}

export function clearOrganizationMetadata(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  for (const key of ORG_METADATA_KEYS) {
    delete base[key];
  }
  return base;
}

/** Returns true if setting parentOrgId on pageId would create a cycle. */
export function wouldCreateOrgParentCycle(
  pageId: string,
  parentOrgId: string | null,
  snapshots: Array<{ id: string; metadata: unknown }>,
): boolean {
  if (!parentOrgId || parentOrgId === pageId) return parentOrgId === pageId;
  const parentById = new Map<string, string | null>();
  for (const snap of snapshots) {
    parentById.set(snap.id, parseOrganizationMetadata(snap.metadata).parentOrgId);
  }
  let cursor: string | null = parentOrgId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === pageId) return true;
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    cursor = parentById.get(cursor) ?? null;
  }
  return false;
}

export function pageTitleById(
  flatPages: Array<{ id: string; title: string }>,
  pageId: string | null | undefined,
): string | null {
  if (!pageId) return null;
  return flatPages.find((p) => p.id === pageId)?.title ?? null;
}
