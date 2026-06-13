import {
  coerceAssetReferenceUrl,
} from '../../../shared/assetReferenceValidation.js';
import {
  normalizeImageCredit,
  type ImageCredit,
} from '../../../shared/imageCredit.js';
import {
  normalizeNullablePageId,
  normalizeNullableText,
  normalizeStringArray,
} from './entityRelationTypes.js';

export type { ImageCredit };

export interface CodexAppearanceFields {
  portraitUrl: string | null;
  portraitCredit: ImageCredit | null;
  summary: string | null;
  tags: string[];
}

export function readLegacyMetadataField(
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

export function normalizeCodexAppearance(raw: unknown): CodexAppearanceFields {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { portraitUrl: null, portraitCredit: null, summary: null, tags: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    portraitUrl: coerceAssetReferenceUrl(obj.portraitUrl),
    portraitCredit: normalizeImageCredit(obj.portraitCredit),
    summary: normalizeNullableText(obj.summary),
    tags: normalizeStringArray(obj.tags),
  };
}

export function syncMetadataIndexFields(
  metadata: Record<string, unknown>,
  fieldMap: Record<string, string | null>,
): void {
  const existing = Array.isArray(metadata.fields)
    ? (metadata.fields as Array<{ key: string; value: string }>)
    : [];
  const nextFields = [...existing.filter((f) => !(f.key in fieldMap))];
  for (const [key, value] of Object.entries(fieldMap)) {
    nextFields.push({ key, value: value ?? '' });
  }
  metadata.fields = nextFields;
}

export function normalizePageIdList(raw: unknown): string[] {
  return normalizeStringArray(raw).filter(Boolean);
}

export function normalizeOptionalPageId(raw: unknown): string | null {
  return normalizeNullablePageId(raw);
}
