import { coerceAssetReferenceUrl } from '../../../shared/assetReferenceValidation.js';
import { normalizeImageCredit, type ImageCredit } from '../../../shared/imageCredit.js';
import {
  normalizeAppearanceGallery,
  type AppearanceGalleryState,
} from '../../../shared/appearanceMetadata.js';
import {
  normalizeNullablePageId,
  normalizeNullableText,
  normalizeStringArray,
} from './entityRelationTypes.js';

export interface BestiaryAppearanceFields {
  portraitUrl: string | null;
  portraitCredit: ImageCredit | null;
  summary: string | null;
  tags: string[];
  gallery: AppearanceGalleryState;
}

export interface BestiaryMetadataFields {
  creatureType: string | null;
  habitat: string | null;
  threatLevel: string | null;
  region: string | null;
  intelligence: string | null;
  knownFor: string | null;
  behaviorSummary: string | null;
  alsoKnownAs: string | null;
  temperament: string | null;
  encounterConditions: string | null;
  encounterRate: string | null;
  activePeriods: string[];
  weaknesses: string[];
  resistances: string[];
  immunities: string[];
  factionAlignment: string | null;
  corruptionAffinity: string | null;
  appearance: BestiaryAppearanceFields;
  relatedCreatureIds: string[];
  relatedLocationIds: string[];
}

const BESTIARY_METADATA_KEYS = [
  'creatureType',
  'habitat',
  'threatLevel',
  'region',
  'intelligence',
  'knownFor',
  'behaviorSummary',
  'alsoKnownAs',
  'temperament',
  'encounterConditions',
  'encounterRate',
  'activePeriods',
  'weaknesses',
  'resistances',
  'immunities',
  'factionAlignment',
  'corruptionAffinity',
  'appearance',
  'relatedCreatureIds',
  'relatedLocationIds',
] as const;

const EMPTY_BESTIARY: BestiaryMetadataFields = {
  creatureType: null,
  habitat: null,
  threatLevel: null,
  region: null,
  intelligence: null,
  knownFor: null,
  behaviorSummary: null,
  alsoKnownAs: null,
  temperament: null,
  encounterConditions: null,
  encounterRate: null,
  activePeriods: [],
  weaknesses: [],
  resistances: [],
  immunities: [],
  factionAlignment: null,
  corruptionAffinity: null,
  appearance: { portraitUrl: null, portraitCredit: null, summary: null, tags: [], gallery: { entries: [] } },
  relatedCreatureIds: [],
  relatedLocationIds: [],
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

function normalizeAppearance(raw: unknown): BestiaryAppearanceFields {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { portraitUrl: null, portraitCredit: null, summary: null, tags: [], gallery: { entries: [] } };
  }
  const obj = raw as Record<string, unknown>;
  return {
    portraitUrl: coerceAssetReferenceUrl(obj.portraitUrl),
    portraitCredit: normalizeImageCredit(obj.portraitCredit),
    summary: normalizeNullableText(obj.summary),
    tags: normalizeStringArray(obj.tags),
    gallery: normalizeAppearanceGallery(obj.gallery),
  };
}

export function parseBestiaryMetadata(metadata: unknown): BestiaryMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY_BESTIARY, appearance: { ...EMPTY_BESTIARY.appearance } };
  }
  const raw = metadata as Record<string, unknown>;

  return {
    creatureType:
      normalizeNullableText(raw.creatureType) ?? readLegacyField(raw, 'Type'),
    habitat: normalizeNullableText(raw.habitat),
    threatLevel:
      normalizeNullableText(raw.threatLevel) ?? readLegacyField(raw, 'Rarity'),
    region: normalizeNullableText(raw.region),
    intelligence: normalizeNullableText(raw.intelligence),
    knownFor: normalizeNullableText(raw.knownFor),
    behaviorSummary: normalizeNullableText(raw.behaviorSummary),
    alsoKnownAs: normalizeNullableText(raw.alsoKnownAs),
    temperament: normalizeNullableText(raw.temperament),
    encounterConditions: normalizeNullableText(raw.encounterConditions),
    encounterRate: normalizeNullableText(raw.encounterRate),
    activePeriods: normalizeStringArray(raw.activePeriods),
    weaknesses: normalizeStringArray(raw.weaknesses),
    resistances: normalizeStringArray(raw.resistances),
    immunities: normalizeStringArray(raw.immunities),
    factionAlignment: normalizeNullableText(raw.factionAlignment),
    corruptionAffinity: normalizeNullableText(raw.corruptionAffinity),
    appearance: normalizeAppearance(raw.appearance),
    relatedCreatureIds: normalizeStringArray(raw.relatedCreatureIds).filter(Boolean),
    relatedLocationIds: normalizeStringArray(raw.relatedLocationIds).filter(Boolean),
  };
}

function syncBestiaryIndexFields(
  metadata: Record<string, unknown>,
  bestiary: BestiaryMetadataFields,
): void {
  const fieldMap: Record<string, string | null> = {
    Type: bestiary.creatureType,
    Habitat: bestiary.habitat,
    Threat: bestiary.threatLevel,
    Region: bestiary.region,
    Intelligence: bestiary.intelligence,
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

export function mergeBestiaryMetadata(
  existing: unknown,
  patch: Partial<Omit<BestiaryMetadataFields, 'appearance'>> & {
    appearance?: Partial<BestiaryAppearanceFields>;
  },
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseBestiaryMetadata(base);
  const merged: BestiaryMetadataFields = {
    ...parsed,
    ...patch,
    appearance: patch.appearance
      ? { ...parsed.appearance, ...patch.appearance }
      : parsed.appearance,
    activePeriods: patch.activePeriods ?? parsed.activePeriods,
    weaknesses: patch.weaknesses ?? parsed.weaknesses,
    resistances: patch.resistances ?? parsed.resistances,
    immunities: patch.immunities ?? parsed.immunities,
    relatedCreatureIds: patch.relatedCreatureIds ?? parsed.relatedCreatureIds,
    relatedLocationIds: patch.relatedLocationIds ?? parsed.relatedLocationIds,
  };

  const result: Record<string, unknown> = {
    ...base,
    creatureType: merged.creatureType,
    habitat: merged.habitat,
    threatLevel: merged.threatLevel,
    region: merged.region,
    intelligence: merged.intelligence,
    knownFor: merged.knownFor,
    behaviorSummary: merged.behaviorSummary,
    alsoKnownAs: merged.alsoKnownAs,
    temperament: merged.temperament,
    encounterConditions: merged.encounterConditions,
    encounterRate: merged.encounterRate,
    activePeriods: merged.activePeriods,
    weaknesses: merged.weaknesses,
    resistances: merged.resistances,
    immunities: merged.immunities,
    factionAlignment: merged.factionAlignment,
    corruptionAffinity: merged.corruptionAffinity,
    appearance: merged.appearance,
    relatedCreatureIds: merged.relatedCreatureIds,
    relatedLocationIds: merged.relatedLocationIds,
  };

  syncBestiaryIndexFields(result, merged);
  return result;
}

export function hasBestiaryMetadataPatch(body: Record<string, unknown>): boolean {
  return BESTIARY_METADATA_KEYS.some((key) => key in body);
}

export function resolveBestiaryMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasBestiaryMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasBestiaryMetadataPatch(body)) {
    return body;
  }
  return null;
}

export function isBestiaryMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return BESTIARY_METADATA_KEYS.some((key) => {
    const value = raw[key];
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (key === 'appearance' && typeof value === 'object') {
      const appearance = normalizeAppearance(value);
      return Boolean(
        appearance.portraitUrl || appearance.summary || appearance.tags.length > 0,
      );
    }
    return true;
  });
}
