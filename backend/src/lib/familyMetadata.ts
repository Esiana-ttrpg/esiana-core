import {
  normalizeNullablePageId,
  normalizeNullableText,
} from './entityRelationTypes.js';

export interface FamilyMetadataFields {
  familyType: string | null;
  status: string | null;
  headCharacterId: string | null;
  seatLocationId: string | null;
  region: string | null;
  coatOfArms: string | null;
  inheritedTraits: string[];
  houseBranch: string | null;
}

const FAMILY_METADATA_KEYS = [
  'familyType',
  'status',
  'headCharacterId',
  'seatLocationId',
  'region',
  'coatOfArms',
  'inheritedTraits',
  'houseBranch',
] as const;

const EMPTY_FAMILY: FamilyMetadataFields = {
  familyType: null,
  status: null,
  headCharacterId: null,
  seatLocationId: null,
  region: null,
  coatOfArms: null,
  inheritedTraits: [],
  houseBranch: null,
};

function readLegacyField(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const fields = metadata.fields;
  if (!Array.isArray(fields)) return null;
  for (const entry of fields) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry as { key?: unknown }).key === key
    ) {
      const value = (entry as { value?: unknown }).value;
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    }
  }
  return null;
}

export function parseFamilyMetadata(metadata: unknown): FamilyMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY_FAMILY };
  }
  const raw = metadata as Record<string, unknown>;
  const traitsRaw = raw.inheritedTraits;
  const inheritedTraits = Array.isArray(traitsRaw)
    ? traitsRaw
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim())
    : [];

  return {
    familyType: normalizeNullableText(raw.familyType) ?? readLegacyField(raw, 'Type'),
    status: normalizeNullableText(raw.status) ?? readLegacyField(raw, 'Status'),
    headCharacterId: normalizeNullablePageId(raw.headCharacterId),
    seatLocationId: normalizeNullablePageId(raw.seatLocationId),
    region: normalizeNullableText(raw.region) ?? readLegacyField(raw, 'Region'),
    coatOfArms: normalizeNullableText(raw.coatOfArms),
    inheritedTraits,
    houseBranch: normalizeNullableText(raw.houseBranch),
  };
}

export function isFamilyMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return FAMILY_METADATA_KEYS.some((key) => {
    const value = raw[key];
    if (value === undefined || value === null) return false;
    if (key === 'inheritedTraits' && Array.isArray(value)) return value.length > 0;
    return true;
  });
}

function syncFamilyIndexFields(
  metadata: Record<string, unknown>,
  family: FamilyMetadataFields,
): void {
  const fieldMap: Record<string, string | null> = {
    Type: family.familyType,
    Region: family.region,
    Status: family.status,
  };
  const existing = Array.isArray(metadata.fields)
    ? (metadata.fields as Array<{ key: string; value: string }>)
    : [];
  const nextFields = [...existing.filter((f) => !(f.key in fieldMap))];
  for (const [key, value] of Object.entries(fieldMap)) {
    nextFields.push({ key, value: value ?? '' });
  }
  metadata.fields = nextFields;
}

export function mergeFamilyMetadata(
  existing: unknown,
  patch: Partial<FamilyMetadataFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseFamilyMetadata(base);
  const merged: FamilyMetadataFields = { ...parsed, ...patch };
  const result: Record<string, unknown> = {
    ...base,
    familyType: merged.familyType,
    status: merged.status,
    headCharacterId: merged.headCharacterId,
    seatLocationId: merged.seatLocationId,
    region: merged.region,
    coatOfArms: merged.coatOfArms,
    inheritedTraits: merged.inheritedTraits,
    houseBranch: merged.houseBranch,
  };
  syncFamilyIndexFields(result, merged);
  return result;
}

export function hasFamilyMetadataPatch(body: Record<string, unknown>): boolean {
  return FAMILY_METADATA_KEYS.some((key) => key in body);
}

export function resolveFamilyMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasFamilyMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasFamilyMetadataPatch(body)) {
    return body;
  }
  return null;
}

export function clearFamilyMetadata(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  for (const key of FAMILY_METADATA_KEYS) {
    delete base[key];
  }
  return base;
}
