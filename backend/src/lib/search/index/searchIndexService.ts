import type { Prisma } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { WikiVisibility } from '../../../types/domain.js';
import {
  buildWikiSearchIndexDocument,
  SEARCH_INDEX_SOURCE_KIND_WIKI_PAGE,
  type WikiSearchIndexFlatPage,
  type WikiSearchIndexPageInput,
} from './buildWikiSearchIndexDocument.js';
import { getSearchIndexEngine } from './getSearchIndexEngine.js';

type Tx = Prisma.TransactionClient | typeof prisma;

const PAGE_SELECT = {
  id: true,
  title: true,
  templateType: true,
  metadata: true,
  blocks: true,
  visibility: true,
  parentId: true,
  workspace: true,
  updatedAt: true,
  aliases: { select: { alias: true } },
  characterFields: {
    select: {
      label: true,
      fieldType: true,
      value: true,
      capabilities: true,
      pageTab: {
        select: {
          hidden: true,
          visibility: true,
          coreKey: true,
        },
      },
    },
  },
} as const;

const REBUILD_BATCH = 200;

const ensureInFlight = new Map<string, Promise<void>>();
const ensureDone = new Set<string>();

function toFlat(page: {
  id: string;
  title: string;
  parentId: string | null;
  templateType: string;
  metadata: unknown;
  workspace: string | null;
}): WikiSearchIndexFlatPage {
  return {
    id: page.id,
    title: page.title,
    parentId: page.parentId,
    templateType: page.templateType,
    metadata: page.metadata,
    workspace: page.workspace,
  };
}

async function loadPageForIndex(
  tx: Tx,
  campaignId: string,
  pageId: string,
): Promise<WikiSearchIndexPageInput | null> {
  const page = await tx.wikiPage.findFirst({
    where: { id: pageId, campaignId, deletedAt: null },
    select: PAGE_SELECT,
  });
  return page as WikiSearchIndexPageInput | null;
}

async function loadFlatPagesForCategory(
  tx: Tx,
  campaignId: string,
  page: WikiSearchIndexPageInput,
): Promise<WikiSearchIndexFlatPage[]> {
  const flats: WikiSearchIndexFlatPage[] = [toFlat(page)];
  let parentId = page.parentId;
  const seen = new Set<string>([page.id]);
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = await tx.wikiPage.findFirst({
      where: { id: parentId, campaignId, deletedAt: null },
      select: {
        id: true,
        title: true,
        parentId: true,
        templateType: true,
        metadata: true,
        workspace: true,
      },
    });
    if (!parent) break;
    flats.push(toFlat(parent));
    parentId = parent.parentId;
  }
  return flats;
}

/**
 * Upsert the derived search document for a live wiki page.
 * Soft-deleted pages are removed from the index instead.
 */
export async function upsertWikiPageDocument(
  tx: Tx,
  campaignId: string,
  pageId: string,
  flatPages?: WikiSearchIndexFlatPage[],
): Promise<void> {
  const page = await loadPageForIndex(tx, campaignId, pageId);
  if (!page) {
    await deleteDocumentsForPages(tx, [pageId]);
    return;
  }

  const flats = flatPages ?? (await loadFlatPagesForCategory(tx, campaignId, page));

  const doc = buildWikiSearchIndexDocument(page, flats);

  const row = await tx.searchIndexDocument.upsert({
    where: {
      sourceKind_sourceId: {
        sourceKind: SEARCH_INDEX_SOURCE_KIND_WIKI_PAGE,
        sourceId: pageId,
      },
    },
    create: {
      campaignId,
      sourceKind: doc.sourceKind,
      sourceId: doc.sourceId,
      providerId: doc.providerId,
      typeKey: doc.typeKey,
      visibility: doc.visibility,
      title: doc.title,
      titleNorm: doc.titleNorm,
      aliasText: doc.aliasText,
      metadataText: doc.metadataText,
      customFieldText: doc.customFieldText,
      bodyText: doc.bodyText,
      elevatedText: doc.elevatedText,
      sourceUpdatedAt: doc.sourceUpdatedAt,
      indexedAt: new Date(),
    },
    update: {
      campaignId,
      providerId: doc.providerId,
      typeKey: doc.typeKey,
      visibility: doc.visibility,
      title: doc.title,
      titleNorm: doc.titleNorm,
      aliasText: doc.aliasText,
      metadataText: doc.metadataText,
      customFieldText: doc.customFieldText,
      bodyText: doc.bodyText,
      elevatedText: doc.elevatedText,
      sourceUpdatedAt: doc.sourceUpdatedAt,
      indexedAt: new Date(),
    },
    select: { id: true },
  });

  await getSearchIndexEngine().afterUpsert(tx as never, row.id);
}

export async function deleteDocumentsForPages(
  tx: Tx,
  pageIds: string[],
): Promise<void> {
  const unique = [...new Set(pageIds.filter(Boolean))];
  if (unique.length === 0) return;
  await tx.searchIndexDocument.deleteMany({
    where: {
      sourceKind: SEARCH_INDEX_SOURCE_KIND_WIKI_PAGE,
      sourceId: { in: unique },
    },
  });
}

/**
 * Delete all search docs for a campaign and re-project every live wiki page.
 */
export async function rebuildSearchIndexForCampaign(
  campaignId: string,
): Promise<number> {
  await prisma.searchIndexDocument.deleteMany({ where: { campaignId } });

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: PAGE_SELECT,
  });
  const flatPages = pages.map(toFlat);

  let indexed = 0;
  for (let i = 0; i < pages.length; i += REBUILD_BATCH) {
    const batch = pages.slice(i, i + REBUILD_BATCH);
    for (const page of batch) {
      const doc = buildWikiSearchIndexDocument(
        page as WikiSearchIndexPageInput,
        flatPages,
      );
      const row = await prisma.searchIndexDocument.create({
        data: {
          campaignId,
          sourceKind: doc.sourceKind,
          sourceId: doc.sourceId,
          providerId: doc.providerId,
          typeKey: doc.typeKey,
          visibility: doc.visibility,
          title: doc.title,
          titleNorm: doc.titleNorm,
          aliasText: doc.aliasText,
          metadataText: doc.metadataText,
          customFieldText: doc.customFieldText,
          bodyText: doc.bodyText,
          elevatedText: doc.elevatedText,
          sourceUpdatedAt: doc.sourceUpdatedAt,
          indexedAt: new Date(),
        },
        select: { id: true },
      });
      await getSearchIndexEngine().afterUpsert(prisma as never, row.id);
      indexed += 1;
    }
  }

  ensureDone.add(campaignId);
  return indexed;
}

/**
 * Lazy guard: if the campaign has live pages but zero search docs, rebuild once.
 * Memoized per process so upgraded deployments work before the backfill script runs.
 */
export async function ensureCampaignIndexed(campaignId: string): Promise<void> {
  if (ensureDone.has(campaignId)) return;

  const existing = ensureInFlight.get(campaignId);
  if (existing) {
    await existing;
    return;
  }

  const work = (async () => {
    const [pageCount, docCount] = await Promise.all([
      prisma.wikiPage.count({ where: { campaignId, deletedAt: null } }),
      prisma.searchIndexDocument.count({ where: { campaignId } }),
    ]);
    if (pageCount > 0 && docCount === 0) {
      await rebuildSearchIndexForCampaign(campaignId);
    } else {
      ensureDone.add(campaignId);
    }
  })();

  ensureInFlight.set(campaignId, work);
  try {
    await work;
  } finally {
    ensureInFlight.delete(campaignId);
  }
}

/** Test helper to clear the lazy-ensure memo. */
export function clearSearchIndexEnsureMemoForTests(): void {
  ensureDone.clear();
  ensureInFlight.clear();
}

export { WikiVisibility };
