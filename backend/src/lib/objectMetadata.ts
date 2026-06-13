import {
  normalizeCodexAppearance,
  normalizeOptionalPageId,
  normalizePageIdList,
  readLegacyMetadataField,
  syncMetadataIndexFields,
  type CodexAppearanceFields,
} from './codexMetadataShared.js';
import { normalizeNullableText } from './entityRelationTypes.js';

export interface ObjectMetadataFields {
  objectType: string | null;
  knownFor: string | null;
  provenance: string | null;
  historicalSignificance: string | null;
  powersSummary: string | null;
  investedOrMagical: string | null;
  currentHolderId: string | null;
  appearance: CodexAppearanceFields;
  relatedOrganizationIds: string[];
  relatedLocationIds: string[];
}

const OBJECT_METADATA_KEYS = [
  'objectType',
  'knownFor',
  'provenance',
  'historicalSignificance',
  'powersSummary',
  'investedOrMagical',
  'currentHolderId',
  'appearance',
  'relatedOrganizationIds',
  'relatedLocationIds',
] as const;

const EMPTY: ObjectMetadataFields = {
  objectType: null,
  knownFor: null,
  provenance: null,
  historicalSignificance: null,
  powersSummary: null,
  investedOrMagical: null,
  currentHolderId: null,
  appearance: { portraitUrl: null, portraitCredit: null, summary: null, tags: [] },
  relatedOrganizationIds: [],
  relatedLocationIds: [],
};

export function parseObjectMetadata(metadata: unknown): ObjectMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY, appearance: { ...EMPTY.appearance } };
  }
  const raw = metadata as Record<string, unknown>;
  return {
    objectType:
      normalizeNullableText(raw.objectType) ?? readLegacyMetadataField(raw, 'Type'),
    knownFor: normalizeNullableText(raw.knownFor),
    provenance: normalizeNullableText(raw.provenance),
    historicalSignificance: normalizeNullableText(raw.historicalSignificance),
    powersSummary: normalizeNullableText(raw.powersSummary),
    investedOrMagical:
      normalizeNullableText(raw.investedOrMagical) ??
      readLegacyMetadataField(raw, 'Invested/Magical'),
    currentHolderId: normalizeOptionalPageId(raw.currentHolderId),
    appearance: normalizeCodexAppearance(raw.appearance),
    relatedOrganizationIds: normalizePageIdList(raw.relatedOrganizationIds),
    relatedLocationIds: normalizePageIdList(raw.relatedLocationIds),
  };
}

export function mergeObjectMetadata(
  existing: unknown,
  patch: Partial<Omit<ObjectMetadataFields, 'appearance'>> & {
    appearance?: Partial<CodexAppearanceFields>;
  },
  options?: { resolvePageTitle?: (pageId: string) => string | null },
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseObjectMetadata(base);
  const merged: ObjectMetadataFields = {
    ...parsed,
    ...patch,
    appearance: patch.appearance
      ? { ...parsed.appearance, ...patch.appearance }
      : parsed.appearance,
    relatedOrganizationIds:
      patch.relatedOrganizationIds ?? parsed.relatedOrganizationIds,
    relatedLocationIds: patch.relatedLocationIds ?? parsed.relatedLocationIds,
  };
  const holderLabel =
    merged.currentHolderId && options?.resolvePageTitle
      ? options.resolvePageTitle(merged.currentHolderId) ?? merged.currentHolderId
      : merged.currentHolderId;
  const result: Record<string, unknown> = { ...base, ...merged };
  syncMetadataIndexFields(result, {
    Type: merged.objectType,
    Significance: merged.historicalSignificance,
    Holder: holderLabel,
    'Invested/Magical': merged.investedOrMagical,
  });
  return result;
}

export function hasObjectMetadataPatch(body: Record<string, unknown>): boolean {
  return OBJECT_METADATA_KEYS.some((key) => key in body);
}

export function resolveObjectMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasObjectMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasObjectMetadataPatch(body)) return body;
  return null;
}

export function buildObjectMetadataPatch(
  input: Record<string, unknown>,
): Partial<ObjectMetadataFields> {
  const patch: Partial<ObjectMetadataFields> = {};
  for (const key of OBJECT_METADATA_KEYS) {
    if (key in input) {
      (patch as Record<string, unknown>)[key] =
        parseObjectMetadata({ [key]: input[key] })[key];
    }
  }
  return patch;
}
