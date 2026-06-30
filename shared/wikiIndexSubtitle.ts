import { ENTITY_CATEGORY_DISPLAY_BY_KEY } from './entityCategoryKeys.js';
import { getWikiIndexPrimaryColumnKeys } from './wikiIndexMetadata.js';

export interface MetadataField {
  key: string;
  value: string;
}

const EMPTY_INDEX_VALUES = new Set(['UNKNOWN', '—', '-']);

function isEmptyIndexValue(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return true;
  return EMPTY_INDEX_VALUES.has(value.trim().toUpperCase());
}

function readEntityCategoryFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>).entityCategory;
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim();
}

function isCharacterMetadata(metadata: unknown, categoryTitle: string): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  if (categoryTitle === 'Characters') return true;
  const raw = metadata as Record<string, unknown>;
  if ('firstName' in raw || 'quickInfo' in raw) return true;
  const category = raw.entityCategory;
  return typeof category === 'string' && category.toLowerCase() === 'characters';
}

function extractMetadataFields(
  metadata: unknown,
  categoryTitle: string,
): MetadataField[] {
  if (isCharacterMetadata(metadata, categoryTitle)) {
    const raw = metadata as { quickInfo?: MetadataField[] };
    return (raw.quickInfo ?? []).filter((f) => f.value?.trim());
  }
  if (!metadata || typeof metadata !== 'object' || !('fields' in metadata)) {
    return [];
  }
  const fields = (metadata as { fields?: MetadataField[] }).fields;
  if (!Array.isArray(fields)) return [];
  const allowed = new Set(getWikiIndexPrimaryColumnKeys(categoryTitle));
  const allKeys = new Set(
    Object.values(ENTITY_CATEGORY_DISPLAY_BY_KEY).includes(categoryTitle)
      ? getWikiIndexPrimaryColumnKeys(categoryTitle)
      : [],
  );
  void allKeys;
  return fields.filter(
    (field) =>
      field.key &&
      field.value?.trim() &&
      (allowed.size === 0 || allowed.has(field.key)),
  );
}

export function categoryTitleForEntityCategoryKey(
  categoryKey: string | null | undefined,
): string {
  if (!categoryKey || categoryKey === 'all') return 'Characters';
  return ENTITY_CATEGORY_DISPLAY_BY_KEY[categoryKey] ?? 'Characters';
}

export function resolveCategoryTitleForPage(
  metadata: unknown,
  fallbackCategoryKey?: string | null,
): string {
  const fromMeta = readEntityCategoryFromMetadata(metadata);
  const key = fromMeta ?? fallbackCategoryKey ?? null;
  if (key) return categoryTitleForEntityCategoryKey(key);
  return 'Characters';
}

/**
 * Single-line subtitle matching codex index primary field display.
 */
export function buildWikiIndexSubtitle(
  metadata: unknown,
  categoryTitle: string,
): string | null {
  const primaryKeys = getWikiIndexPrimaryColumnKeys(categoryTitle);
  const fields = extractMetadataFields(metadata, categoryTitle);
  const values: string[] = [];

  for (const key of primaryKeys) {
    const match = fields.find((field) => field.key === key);
    if (match && !isEmptyIndexValue(match.value)) {
      values.push(match.value.trim());
    }
    if (values.length >= 2) break;
  }

  if (values.length === 0) {
    for (const field of fields) {
      if (!isEmptyIndexValue(field.value)) {
        values.push(field.value.trim());
      }
      if (values.length >= 2) break;
    }
  }

  return values.length > 0 ? values.join(' · ') : null;
}
