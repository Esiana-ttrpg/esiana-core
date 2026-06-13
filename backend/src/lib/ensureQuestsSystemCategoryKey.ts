import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  buildQuestsCategoryMetadata,
  isQuestsCategoryPage,
  parseSystemCategoryKey,
  resolveQuestsCategoryPage,
} from './wikiSystemCategory.js';

function mergeMetadataWithQuestsKey(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...buildQuestsCategoryMetadata() };
}

/**
 * Idempotently stamps systemCategoryKey on the Quests category folder.
 * Returns the quests category page id.
 */
export async function ensureQuestsSystemCategoryKey(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string | null> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId },
    select: { id: true, title: true, parentId: true, metadata: true },
  });

  const existing = resolveQuestsCategoryPage(pages);
  if (!existing) return null;

  if (isQuestsCategoryPage(existing.metadata)) {
    return existing.id;
  }

  await db.wikiPage.update({
    where: { id: existing.id },
    data: {
      metadata: mergeMetadataWithQuestsKey(existing.metadata) as never,
    },
  });

  return existing.id;
}

export function questsCategoryKeyFromMetadata(metadata: unknown): boolean {
  return parseSystemCategoryKey(metadata) === 'quests';
}
