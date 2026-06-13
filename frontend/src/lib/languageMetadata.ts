import {
  normalizeCodexAppearance,
  normalizePageIdList,
  readLegacyMetadataField,
  syncMetadataIndexFields,
  type CodexAppearanceFields,
} from './codexMetadataShared';
import { normalizeNullableText } from './entityRelationTypes';

export interface LanguageMetadataFields {
  languageFamily: string | null;
  script: string | null;
  region: string | null;
  typicalSpeakers: string | null;
  status: string | null;
  appearance: CodexAppearanceFields;
  relatedLocationIds: string[];
}

const LANGUAGE_METADATA_KEYS = [
  'languageFamily',
  'script',
  'region',
  'typicalSpeakers',
  'status',
  'appearance',
  'relatedLocationIds',
] as const;

const EMPTY: LanguageMetadataFields = {
  languageFamily: null,
  script: null,
  region: null,
  typicalSpeakers: null,
  status: null,
  appearance: { portraitUrl: null, portraitCredit: null, summary: null, tags: [] },
  relatedLocationIds: [],
};

export function parseLanguageMetadata(metadata: unknown): LanguageMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY, appearance: { ...EMPTY.appearance } };
  }
  const raw = metadata as Record<string, unknown>;
  return {
    languageFamily:
      normalizeNullableText(raw.languageFamily)
      ?? readLegacyMetadataField(raw, 'Language Family'),
    script:
      normalizeNullableText(raw.script) ?? readLegacyMetadataField(raw, 'Script'),
    region:
      normalizeNullableText(raw.region) ?? readLegacyMetadataField(raw, 'Region'),
    typicalSpeakers:
      normalizeNullableText(raw.typicalSpeakers)
      ?? readLegacyMetadataField(raw, 'Typical Speakers'),
    status:
      normalizeNullableText(raw.status) ?? readLegacyMetadataField(raw, 'Status'),
    appearance: normalizeCodexAppearance(raw.appearance),
    relatedLocationIds: normalizePageIdList(raw.relatedLocationIds),
  };
}

function syncIndex(
  metadata: Record<string, unknown>,
  language: LanguageMetadataFields,
): void {
  syncMetadataIndexFields(metadata, {
    'Language Family': language.languageFamily,
    Script: language.script,
    Region: language.region,
    'Typical Speakers': language.typicalSpeakers,
    Status: language.status,
  });
}

export function mergeLanguageMetadata(
  metadata: Record<string, unknown>,
  patch: Partial<LanguageMetadataFields>,
): Record<string, unknown> {
  const current = parseLanguageMetadata(metadata);
  const next: LanguageMetadataFields = {
    ...current,
    ...patch,
    appearance: patch.appearance
      ? { ...current.appearance, ...patch.appearance }
      : current.appearance,
    relatedLocationIds:
      patch.relatedLocationIds ?? current.relatedLocationIds,
  };
  const out = { ...metadata };
  for (const key of LANGUAGE_METADATA_KEYS) {
    const value = next[key as keyof LanguageMetadataFields];
    if (value === null || value === undefined) {
      delete out[key];
    } else if (Array.isArray(value) && value.length === 0) {
      delete out[key];
    } else {
      out[key] = value;
    }
  }
  syncIndex(out, next);
  return out;
}

export function buildLanguageMetadataPatch(
  body: Record<string, unknown>,
): Partial<LanguageMetadataFields> | null {
  const hasKey = LANGUAGE_METADATA_KEYS.some((key) => key in body);
  if (!hasKey) return null;
  const parsed = parseLanguageMetadata(body);
  return parsed;
}

export function hasLanguageMetadataPatch(body: Record<string, unknown>): boolean {
  return LANGUAGE_METADATA_KEYS.some((key) => key in body);
}
