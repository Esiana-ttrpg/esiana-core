import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  buildPartyCategoryMetadata,
  isPartyCategoryPage,
  resolvePartyCategoryPage,
} from './wikiSystemCategory.js';

function mergeMetadataWithPartyKey(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...buildPartyCategoryMetadata() };
}

/**
 * Idempotently stamps systemCategoryKey on the Party category folder.
 * Returns the party category page id.
 */
export async function ensurePartySystemCategoryKey(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string | null> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId },
    select: { id: true, title: true, parentId: true, metadata: true },
  });

  const existing = resolvePartyCategoryPage(pages);
  if (!existing) return null;

  if (isPartyCategoryPage(existing.metadata)) {
    return existing.id;
  }

  await db.wikiPage.update({
    where: { id: existing.id },
    data: {
      metadata: mergeMetadataWithPartyKey(existing.metadata) as never,
    },
  });

  return existing.id;
}
