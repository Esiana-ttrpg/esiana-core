import type { Prisma } from '@prisma/client';
import {
  entityCategoryIndexMatchValues,
  normalizeEntityCategoryKey,
} from './entityCategoryKeys.js';

/** JSON metadata key stamped when creating pages from a category index. */
export const WIKI_ENTITY_CATEGORY_METADATA_KEY = 'entityCategory';

/**
 * Type-first index membership: Characters/Locations lists are campaign-wide by
 * entity type, not limited to direct children of the category folder.
 */
const CATEGORY_TEMPLATE_TYPE_FALLBACK: Record<string, string> = {
  Characters: 'CHARACTER',
  Locations: 'LOCATION',
  Organizations: 'ORGANIZATION',
  Families: 'FAMILY',
};

export function readEntityCategoryFromMetadata(
  metadata: unknown,
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[
    WIKI_ENTITY_CATEGORY_METADATA_KEY
  ];
  if (typeof value !== 'string' || !value.trim()) return null;
  return normalizeEntityCategoryKey(value.trim());
}

/** Campaign-wide where clause for pages belonging to a category index. */
export function buildCategoryIndexWhereClause(
  categoryTitle: string,
  categoryPageId?: string,
): Prisma.WikiPageWhereInput {
  // SQLite provider expects `path` as a dot-separated string, not a string[].
  const categoryMatchValues = entityCategoryIndexMatchValues(categoryTitle);
  const orConditions: Prisma.WikiPageWhereInput[] = categoryMatchValues.map(
    (value) => ({
      metadata: {
        path: WIKI_ENTITY_CATEGORY_METADATA_KEY,
        equals: value,
      },
    }),
  );

  if (categoryPageId) {
    orConditions.push({ parentId: categoryPageId });
  }

  const templateType = CATEGORY_TEMPLATE_TYPE_FALLBACK[categoryTitle];
  if (templateType) {
    orConditions.push({ templateType });
  }

  return { OR: orConditions };
}
