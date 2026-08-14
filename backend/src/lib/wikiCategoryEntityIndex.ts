import type { Prisma } from '@prisma/client';
import {
  entityCategoryIndexMatchValues,
} from './entityCategoryKeys.js';
import { prismaJsonPath } from './prismaJsonPath.js';

/** JSON metadata key stamped when creating pages from a category index. */
export const WIKI_ENTITY_CATEGORY_METADATA_KEY = 'entityCategory';

export { readEntityCategoryFromMetadata } from '../../../shared/wikiTemplateType.js';

/** Campaign-wide where clause for pages belonging to a category index. */
export function buildCategoryIndexWhereClause(
  categoryTitle: string,
  categoryPageId?: string,
): Prisma.WikiPageWhereInput {
  const categoryMatchValues = entityCategoryIndexMatchValues(categoryTitle);
  const orConditions: Prisma.WikiPageWhereInput[] = categoryMatchValues.map(
    (value) => ({
      metadata: {
        path: prismaJsonPath(WIKI_ENTITY_CATEGORY_METADATA_KEY),
        equals: value,
      },
    }),
  );

  if (categoryPageId) {
    orConditions.push({ parentId: categoryPageId });
  }

  return { OR: orConditions };
}

/** Prisma filter for pages with a canonical entity category in metadata. */
export function buildEntityCategoryWhereClause(
  entityCategoryKey: string,
): Prisma.WikiPageWhereInput {
  const values = entityCategoryIndexMatchValues(
    entityCategoryKey === 'characters'
      ? 'Characters'
      : entityCategoryKey === 'locations'
        ? 'Locations'
        : entityCategoryKey === 'organizations'
          ? 'Organizations'
          : entityCategoryKey === 'families'
            ? 'Families'
            : entityCategoryKey,
  );
  return {
    OR: values.map((value) => ({
      metadata: {
        path: prismaJsonPath(WIKI_ENTITY_CATEGORY_METADATA_KEY),
        equals: value,
      },
    })),
  };
}
