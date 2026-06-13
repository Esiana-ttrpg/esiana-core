import { getCategoryColumns, hasCustomMetadata } from './metadataConfig';
import { normalizeEntityCategoryKey } from './entityCategoryKeys';
import type { CategoryMetadata, CharacterMetadata, MetadataField } from '@/types/wiki';

/**
 * Get metadata fields configuration based on parent category title.
 */
export function getCategoryMetadataConfig(parentTitle: string): string[] {
  if (!hasCustomMetadata(parentTitle)) return [];
  return getCategoryColumns(parentTitle);
}

function isCharacterMetadata(
  metadata: CategoryMetadata | CharacterMetadata | undefined,
  parentTitle: string,
): metadata is CharacterMetadata {
  if (!metadata || typeof metadata !== 'object') return false;
  if (parentTitle === 'Characters') return true;
  const raw = metadata as Record<string, unknown>;
  if ('firstName' in raw || 'quickInfo' in raw) return true;
  const category = raw.entityCategory;
  return (
    typeof category === 'string' &&
    normalizeEntityCategoryKey(category) === 'characters'
  );
}

/**
 * Filter metadata fields to only include those relevant to the category.
 */
export function filterMetadataForCategory(
  metadata: CategoryMetadata | CharacterMetadata | undefined,
  parentTitle: string,
): MetadataField[] {
  if (isCharacterMetadata(metadata, parentTitle)) {
    return metadata.quickInfo ?? [];
  }

  // Handle old-style Category metadata
  if (!metadata || !('fields' in metadata)) return [];
  const catMeta = metadata as CategoryMetadata;
  if (!catMeta.fields || !hasCustomMetadata(parentTitle)) return [];

  const expectedKeys = new Set(getCategoryMetadataConfig(parentTitle));
  return catMeta.fields.filter((field) => expectedKeys.has(field.key));
}

/**
 * Check if a category has specialized metadata display.
 */
export function hasSpecializedMetadata(parentTitle: string): boolean {
  return hasCustomMetadata(parentTitle);
}

/**
 * Get display-friendly metadata fields.
 */
export function getDisplayMetadata(
  metadata: CategoryMetadata | CharacterMetadata | undefined,
  parentTitle: string,
): MetadataField[] {
  const fields = filterMetadataForCategory(metadata, parentTitle);
  return fields.filter((f) => f.value && f.value.trim());
}

/** Reads a single wiki category field from metadata.fields (e.g. Location, Progress). */
export function readCategoryMetadataField(
  metadata: unknown,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const fields = (metadata as CategoryMetadata).fields;
  if (!Array.isArray(fields)) return null;
  const match = fields.find((field) => field.key === key);
  const value = match?.value?.trim();
  return value ? value : null;
}
