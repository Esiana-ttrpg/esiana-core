import type { Prisma } from '@prisma/client';
import { WikiVisibility } from '../types/domain.js';
import {
  WORKSHOP_DRAFTS_ROOT_TITLE,
  buildWorkshopDraftsRootMetadata,
  isWorkshopDraftsRootMetadata,
} from '../../../shared/workshopDocument.js';
import { prisma } from './prisma.js';

export async function ensureWorkshopDraftsRoot(
  campaignId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId, deletedAt: null, title: WORKSHOP_DRAFTS_ROOT_TITLE },
    select: { id: true, metadata: true },
  });

  const existing = pages.find((page) => isWorkshopDraftsRootMetadata(page.metadata));
  if (existing) return existing.id;

  const created = await db.wikiPage.create({
    data: {
      campaignId,
      title: WORKSHOP_DRAFTS_ROOT_TITLE,
      parentId: null,
      visibility: WikiVisibility.DM_ONLY,
      templateType: 'DEFAULT',
      metadata: buildWorkshopDraftsRootMetadata() as never,
      blocks: [],
    },
    select: { id: true },
  });

  return created.id;
}
