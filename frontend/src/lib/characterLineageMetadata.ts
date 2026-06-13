import {
  type ChronologyDateParts,
  type CitationHooks,
  type IdentifiableRecord,
  type RelationVisibility,
  dateSortKey,
  normalizeChronologyDate,
  normalizeNullablePageId,
  normalizeNullableText,
  normalizeRecordId,
  normalizeRelationVisibility,
  normalizeStringArray,
} from './entityRelationTypes';

export type LineageRole = 'HEAD' | 'HEIR' | 'PARTICIPANT' | 'BASTARD' | null;

export type LineageRelationshipType =
  | 'BIOLOGICAL'
  | 'ADOPTIVE'
  | 'STEP'
  | 'MARRIAGE'
  | 'MENTOR'
  | 'GUARDIAN'
  | 'PROGENITOR'
  | 'SUCCESSOR'
  | 'BONDED'
  | 'CREATOR'
  | 'RAISED_BY'
  | 'SWORN'
  | 'OTHER';

export type CharacterSocialLinkTargetType = 'CHARACTER' | 'ORGANIZATION' | 'LOCATION' | 'OBJECT';

export interface CharacterSocialLink extends IdentifiableRecord, CitationHooks {
  targetPageId: string;
  targetType: CharacterSocialLinkTargetType;
  narrativeType: string;
  strength?: number | null;
  polarity?: 'positive' | 'negative' | 'neutral' | 'ambivalent' | null;
  visibility: RelationVisibility;
  startDate?: ChronologyDateParts | null;
  endDate?: ChronologyDateParts | null;
  context?: string | null;
}

export type BloodlineStatus = 'LEGITIMATE' | 'BASTARD' | 'ADOPTED' | 'UNKNOWN' | null;

export type LegitimacyStatus = 'RECOGNIZED' | 'DISPUTED' | 'DENIED' | null;

export interface LineageLink extends IdentifiableRecord, CitationHooks {
  targetCharacterId: string;
  relationshipType: LineageRelationshipType;
  isBiological: boolean;
  isLegal: boolean;
  isPublic: boolean;
  visibility: RelationVisibility;
  marriageType?: string | null;
  startDate?: ChronologyDateParts | null;
  endDate?: ChronologyDateParts | null;
}

export interface CharacterOrgAffiliation extends IdentifiableRecord, CitationHooks {
  orgId: string;
  role: string | null;
  startDate: ChronologyDateParts | null;
  endDate: ChronologyDateParts | null;
  visibility: RelationVisibility;
}

export interface CharacterLineageFields {
  familyId: string | null;
  parentLinks: LineageLink[];
  spouseLinks: LineageLink[];
  birthDate: ChronologyDateParts | null;
  deathDate: ChronologyDateParts | null;
  successionStart: ChronologyDateParts | null;
  successionEnd: ChronologyDateParts | null;
  lineageRole: LineageRole;
  houseBranch: string | null;
  bloodlineStatus: BloodlineStatus;
  legitimacy: LegitimacyStatus;
  orgAffiliations: CharacterOrgAffiliation[];
  socialLinks: CharacterSocialLink[];
}

export const LINEAGE_METADATA_KEYS = [
  'familyId',
  'parentLinks',
  'spouseLinks',
  'birthDate',
  'deathDate',
  'successionStart',
  'successionEnd',
  'lineageRole',
  'houseBranch',
  'bloodlineStatus',
  'legitimacy',
  'orgAffiliations',
  'socialLinks',
] as const;

const EMPTY_LINEAGE: CharacterLineageFields = {
  familyId: null,
  parentLinks: [],
  spouseLinks: [],
  birthDate: null,
  deathDate: null,
  successionStart: null,
  successionEnd: null,
  lineageRole: null,
  houseBranch: null,
  bloodlineStatus: null,
  legitimacy: null,
  orgAffiliations: [],
  socialLinks: [],
};

function normalizeLineageRelationshipType(raw: unknown): LineageRelationshipType {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    const allowed: LineageRelationshipType[] = [
      'BIOLOGICAL',
      'ADOPTIVE',
      'STEP',
      'MARRIAGE',
      'MENTOR',
      'GUARDIAN',
      'PROGENITOR',
      'SUCCESSOR',
      'BONDED',
      'CREATOR',
      'RAISED_BY',
      'SWORN',
      'OTHER',
    ];
    if (allowed.includes(upper as LineageRelationshipType)) {
      return upper as LineageRelationshipType;
    }
  }
  return 'BIOLOGICAL';
}

function normalizeLineageRole(raw: unknown): LineageRole {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    const allowed = ['HEAD', 'HEIR', 'PARTICIPANT', 'BASTARD'] as const;
    if ((allowed as readonly string[]).includes(upper)) {
      return upper as Exclude<LineageRole, null>;
    }
  }
  return null;
}

function normalizeBloodlineStatus(raw: unknown): BloodlineStatus {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    const allowed = ['LEGITIMATE', 'BASTARD', 'ADOPTED', 'UNKNOWN'] as const;
    if ((allowed as readonly string[]).includes(upper)) {
      return upper as Exclude<BloodlineStatus, null>;
    }
  }
  return null;
}

function normalizeLegitimacy(raw: unknown): LegitimacyStatus {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    const allowed = ['RECOGNIZED', 'DISPUTED', 'DENIED'] as const;
    if ((allowed as readonly string[]).includes(upper)) {
      return upper as Exclude<LegitimacyStatus, null>;
    }
  }
  return null;
}

function normalizeBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw;
  return fallback;
}

function normalizeLineageLink(raw: unknown): LineageLink | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const targetCharacterId = normalizeNullablePageId(obj.targetCharacterId);
  if (!targetCharacterId) return null;
  const relationshipType = normalizeLineageRelationshipType(obj.relationshipType);
  return {
    id: normalizeRecordId(obj.id),
    targetCharacterId,
    relationshipType,
    isBiological: normalizeBool(obj.isBiological, relationshipType === 'BIOLOGICAL'),
    isLegal: normalizeBool(obj.isLegal, true),
    isPublic: normalizeBool(obj.isPublic, true),
    visibility: normalizeRelationVisibility(obj.visibility),
    marriageType: normalizeNullableText(obj.marriageType),
    startDate: normalizeChronologyDate(obj.startDate),
    endDate: normalizeChronologyDate(obj.endDate),
    note: normalizeNullableText(obj.note),
    sourcePageIds: normalizeStringArray(obj.sourcePageIds),
    sourceEventIds: normalizeStringArray(obj.sourceEventIds),
  };
}

function normalizeSocialPolarity(
  raw: unknown,
): 'positive' | 'negative' | 'neutral' | 'ambivalent' | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if (lower === 'positive' || lower === 'negative' || lower === 'neutral' || lower === 'ambivalent') {
    return lower;
  }
  return null;
}

function normalizeSocialTargetType(raw: unknown): CharacterSocialLinkTargetType {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    const allowed: CharacterSocialLinkTargetType[] = [
      'CHARACTER',
      'ORGANIZATION',
      'LOCATION',
      'OBJECT',
    ];
    if (allowed.includes(upper as CharacterSocialLinkTargetType)) {
      return upper as CharacterSocialLinkTargetType;
    }
  }
  return 'CHARACTER';
}

function normalizeSocialLink(raw: unknown): CharacterSocialLink | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const targetPageId = normalizeNullablePageId(obj.targetPageId);
  if (!targetPageId) return null;
  const narrativeType =
    typeof obj.narrativeType === 'string' && obj.narrativeType.trim()
      ? obj.narrativeType.trim()
      : 'neutral';
  const strengthRaw = obj.strength;
  const strength =
    typeof strengthRaw === 'number' && Number.isFinite(strengthRaw)
      ? Math.min(100, Math.max(0, Math.round(strengthRaw)))
      : null;
  return {
    id: normalizeRecordId(obj.id),
    targetPageId,
    targetType: normalizeSocialTargetType(obj.targetType),
    narrativeType,
    strength,
    polarity: normalizeSocialPolarity(obj.polarity),
    visibility: normalizeRelationVisibility(obj.visibility),
    startDate: normalizeChronologyDate(obj.startDate),
    endDate: normalizeChronologyDate(obj.endDate),
    context: normalizeNullableText(obj.context),
    note: normalizeNullableText(obj.note),
    sourcePageIds: normalizeStringArray(obj.sourcePageIds),
    sourceEventIds: normalizeStringArray(obj.sourceEventIds),
  };
}

function normalizeOrgAffiliation(raw: unknown): CharacterOrgAffiliation | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const orgId = normalizeNullablePageId(obj.orgId);
  if (!orgId) return null;
  return {
    id: normalizeRecordId(obj.id),
    orgId,
    role: normalizeNullableText(obj.role),
    startDate: normalizeChronologyDate(obj.startDate),
    endDate: normalizeChronologyDate(obj.endDate),
    visibility: normalizeRelationVisibility(obj.visibility),
    note: normalizeNullableText(obj.note),
    sourcePageIds: normalizeStringArray(obj.sourcePageIds),
    sourceEventIds: normalizeStringArray(obj.sourceEventIds),
  };
}

function migrateLegacyParentIds(raw: Record<string, unknown>): LineageLink[] {
  const legacy = raw.parentCharacterIds;
  if (!Array.isArray(legacy)) return [];
  return legacy
    .map((id) => normalizeNullablePageId(id))
    .filter((id): id is string => id !== null)
    .map((targetCharacterId) => ({
      id: normalizeRecordId(undefined),
      targetCharacterId,
      relationshipType: 'BIOLOGICAL' as const,
      isBiological: true,
      isLegal: true,
      isPublic: true,
      visibility: 'GM_ONLY' as const,
    }));
}

function migrateLegacySpouseIds(raw: Record<string, unknown>): LineageLink[] {
  const legacy = raw.spouseCharacterIds;
  if (!Array.isArray(legacy)) return [];
  return legacy
    .map((id) => normalizeNullablePageId(id))
    .filter((id): id is string => id !== null)
    .map((targetCharacterId) => ({
      id: normalizeRecordId(undefined),
      targetCharacterId,
      relationshipType: 'MARRIAGE' as const,
      isBiological: false,
      isLegal: true,
      isPublic: true,
      visibility: 'GM_ONLY' as const,
    }));
}

export function parseCharacterLineageMetadata(metadata: unknown): CharacterLineageFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY_LINEAGE };
  }
  const raw = metadata as Record<string, unknown>;

  let parentLinks = (Array.isArray(raw.parentLinks) ? raw.parentLinks : [])
    .map(normalizeLineageLink)
    .filter((link): link is LineageLink => link !== null);
  if (parentLinks.length === 0) {
    parentLinks = migrateLegacyParentIds(raw);
  }

  let spouseLinks = (Array.isArray(raw.spouseLinks) ? raw.spouseLinks : [])
    .map(normalizeLineageLink)
    .filter((link): link is LineageLink => link !== null);
  if (spouseLinks.length === 0) {
    spouseLinks = migrateLegacySpouseIds(raw);
  }

  const orgAffiliations = (Array.isArray(raw.orgAffiliations) ? raw.orgAffiliations : [])
    .map(normalizeOrgAffiliation)
    .filter((aff): aff is CharacterOrgAffiliation => aff !== null);

  const socialLinks = (Array.isArray(raw.socialLinks) ? raw.socialLinks : [])
    .map(normalizeSocialLink)
    .filter((link): link is CharacterSocialLink => link !== null);

  return {
    familyId: normalizeNullablePageId(raw.familyId),
    parentLinks,
    spouseLinks,
    birthDate: normalizeChronologyDate(raw.birthDate),
    deathDate: normalizeChronologyDate(raw.deathDate),
    successionStart: normalizeChronologyDate(raw.successionStart),
    successionEnd: normalizeChronologyDate(raw.successionEnd),
    lineageRole: normalizeLineageRole(raw.lineageRole),
    houseBranch: normalizeNullableText(raw.houseBranch),
    bloodlineStatus: normalizeBloodlineStatus(raw.bloodlineStatus),
    legitimacy: normalizeLegitimacy(raw.legitimacy),
    orgAffiliations,
    socialLinks,
  };
}

export function isCharacterLineageMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return LINEAGE_METADATA_KEYS.some((key) => {
    const value = raw[key];
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}

export function mergeCharacterLineageMetadata(
  existing: unknown,
  patch: Partial<CharacterLineageFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseCharacterLineageMetadata(base);
  const merged: CharacterLineageFields = { ...parsed, ...patch };
  return {
    ...base,
    familyId: merged.familyId,
    parentLinks: merged.parentLinks,
    spouseLinks: merged.spouseLinks,
    birthDate: merged.birthDate,
    deathDate: merged.deathDate,
    successionStart: merged.successionStart,
    successionEnd: merged.successionEnd,
    lineageRole: merged.lineageRole,
    houseBranch: merged.houseBranch,
    bloodlineStatus: merged.bloodlineStatus,
    legitimacy: merged.legitimacy,
    orgAffiliations: merged.orgAffiliations,
    socialLinks: merged.socialLinks,
  };
}

export function hasCharacterLineageMetadataPatch(
  body: Record<string, unknown>,
): boolean {
  return LINEAGE_METADATA_KEYS.some((key) => key in body);
}

export function resolveCharacterLineageMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasCharacterLineageMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasCharacterLineageMetadataPatch(body)) {
    return body;
  }
  return null;
}

export function clearCharacterLineageMetadata(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  for (const key of LINEAGE_METADATA_KEYS) {
    delete base[key];
  }
  return base;
}

export function isCharacterAliveAt(
  lineage: CharacterLineageFields,
  date: ChronologyDateParts,
): boolean {
  const queryKey = dateSortKey(date);
  if (lineage.birthDate) {
    const birthKey = dateSortKey(lineage.birthDate);
    if (queryKey < birthKey) return false;
  }
  if (lineage.deathDate) {
    const deathKey = dateSortKey(lineage.deathDate);
    if (queryKey > deathKey) return false;
  }
  return true;
}

