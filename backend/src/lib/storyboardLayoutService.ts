import type { Prisma } from '@prisma/client';
import { STORYBOARD_LAYOUT_METADATA_KEY } from './adventureConstants.js';
import {
  emptyStoryboardView,
  parseStoryboardView,
  type StoryboardViewV1,
} from '../../../shared/storyboardProjection.js';
import { prisma } from './prisma.js';
import { resolveQuestsCategoryPage } from './wikiSystemCategory.js';

export { STORYBOARD_LAYOUT_METADATA_KEY };

export async function loadStoryboardLayout(
  campaignId: string,
): Promise<{ layoutPageId: string | null; layout: StoryboardViewV1 }> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, parentId: true, metadata: true },
  });

  const questsRoot = resolveQuestsCategoryPage(pages);
  if (!questsRoot) {
    return { layoutPageId: null, layout: emptyStoryboardView() };
  }

  const layoutPage = pages.find((page) => {
    if (page.parentId !== questsRoot.id) return false;
    if (page.title !== '__storyboard_layout__') return false;
    const meta = page.metadata as Record<string, unknown> | null;
    return Boolean(meta?.[STORYBOARD_LAYOUT_METADATA_KEY]);
  });

  if (!layoutPage) {
    return { layoutPageId: null, layout: emptyStoryboardView() };
  }

  const meta = layoutPage.metadata as Record<string, unknown>;
  return {
    layoutPageId: layoutPage.id,
    layout: parseStoryboardView(meta[STORYBOARD_LAYOUT_METADATA_KEY]),
  };
}

export async function saveStoryboardLayout(
  campaignId: string,
  layout: StoryboardViewV1,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ layoutPageId: string }> {
  const pages = await db.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, parentId: true, metadata: true },
  });

  const questsRoot = resolveQuestsCategoryPage(pages);
  if (!questsRoot) {
    throw new Error('QUESTS_CATEGORY_NOT_FOUND');
  }

  const existing = pages.find(
    (page) =>
      page.parentId === questsRoot.id &&
      page.title === '__storyboard_layout__',
  );

  const metadata = { [STORYBOARD_LAYOUT_METADATA_KEY]: layout };

  if (existing) {
    await db.wikiPage.update({
      where: { id: existing.id },
      data: { metadata: metadata as never },
    });
    return { layoutPageId: existing.id };
  }

  const created = await db.wikiPage.create({
    data: {
      campaignId,
      title: '__storyboard_layout__',
      parentId: questsRoot.id,
      visibility: 'DM_ONLY',
      metadata: metadata as never,
      blocks: [],
    },
    select: { id: true },
  });

  return { layoutPageId: created.id };
}
