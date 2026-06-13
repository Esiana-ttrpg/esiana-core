import type { Prisma } from '@prisma/client';
import type { AuthoringContextKind } from '../../../shared/authoringContext.js';
import {
  type WorkshopDocument,
  type WorkshopDraftMetadata,
  type WorkshopFormalizeTarget,
  buildWorkshopDraftMetadata,
  isWorkshopDraftMetadata,
  isWorkshopDraftsRootMetadata,
} from '../../../shared/workshopDocument.js';
import { ensureWorkshopDraftsRoot } from './ensureWorkshopDraftsRoot.js';
import { buildFormalizeShell } from './workshopFormalizeShells.js';
import { resolveFormalizeParentId } from './workshopFormalizeRoots.js';
import {
  buildWorkshopDraftBlocks,
  extractWorkshopDraftMarkdown,
  setWorkshopDraftMarkdown,
} from './workshopDraftBlocks.js';
import { prisma } from './prisma.js';
import { WikiVisibility } from '../types/domain.js';
import { syncWikiLinksForSourcePage } from './wikiLinkService.js';
import { countWordsInBlocks } from './wikiLinkExtract.js';

type DraftPageRow = {
  id: string;
  campaignId: string;
  title: string;
  blocks: unknown;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toWorkshopDocument(page: DraftPageRow): WorkshopDocument | null {
  if (!isWorkshopDraftMetadata(page.metadata)) return null;
  const meta = page.metadata as WorkshopDraftMetadata;
  return {
    id: page.id,
    campaignId: page.campaignId,
    authorUserId: meta.authorUserId,
    title: page.title,
    bodyMarkdown: extractWorkshopDraftMarkdown(page.blocks),
    anchorEntityIds: meta.anchorEntityIds,
    sourceKind: meta.sourceKind,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    lastTouchedAt: page.updatedAt.toISOString(),
    formalizedPageId: meta.formalizedPageId ?? null,
    formalizedAt: meta.formalizedAt ?? null,
    draftStatus: meta.draftStatus,
  };
}

export function isWorkshopInfrastructurePage(metadata: unknown): boolean {
  return isWorkshopDraftMetadata(metadata) || isWorkshopDraftsRootMetadata(metadata);
}

export async function listWorkshopDrafts(input: {
  campaignId: string;
  authorUserId: string;
  status?: 'active' | 'formalized' | 'discarded';
  anchorEntityId?: string;
  limit?: number;
}): Promise<WorkshopDocument[]> {
  const pages = await prisma.wikiPage.findMany({
    where: {
      campaignId: input.campaignId,
      deletedAt: null,
    },
    select: {
      id: true,
      campaignId: true,
      title: true,
      blocks: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(100, input.limit ?? 50),
  });

  const status = input.status ?? 'active';
  const anchor = input.anchorEntityId?.trim();

  return pages
    .map((page) => toWorkshopDocument(page))
    .filter((doc): doc is WorkshopDocument => {
      if (!doc) return false;
      if (doc.authorUserId !== input.authorUserId) return false;
      if (doc.draftStatus !== status) return false;
      if (anchor && !doc.anchorEntityIds?.includes(anchor)) return false;
      return true;
    });
}

export async function getWorkshopDraft(input: {
  campaignId: string;
  draftId: string;
  authorUserId: string;
}): Promise<WorkshopDocument | null> {
  const page = await prisma.wikiPage.findFirst({
    where: { id: input.draftId, campaignId: input.campaignId, deletedAt: null },
    select: {
      id: true,
      campaignId: true,
      title: true,
      blocks: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!page) return null;
  const doc = toWorkshopDocument(page);
  if (!doc || doc.authorUserId !== input.authorUserId) return null;
  return doc;
}

export async function createWorkshopDraft(input: {
  campaignId: string;
  authorUserId: string;
  title?: string;
  bodyMarkdown?: string;
  anchorEntityIds?: string[];
  sourceKind?: AuthoringContextKind;
}): Promise<WorkshopDocument> {
  const rootId = await ensureWorkshopDraftsRoot(input.campaignId);
  const metadata = buildWorkshopDraftMetadata({
    authorUserId: input.authorUserId,
    anchorEntityIds: input.anchorEntityIds,
    sourceKind: input.sourceKind,
  });

  const page = await prisma.wikiPage.create({
    data: {
      campaignId: input.campaignId,
      title: input.title?.trim() || 'Untitled',
      parentId: rootId,
      visibility: WikiVisibility.DM_ONLY,
      templateType: 'DEFAULT',
      metadata: metadata as never,
      blocks: buildWorkshopDraftBlocks(input.bodyMarkdown ?? '') as never,
    },
    select: {
      id: true,
      campaignId: true,
      title: true,
      blocks: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const doc = toWorkshopDocument(page);
  if (!doc) throw new Error('Failed to create workshop draft');
  return doc;
}

export async function patchWorkshopDraft(input: {
  campaignId: string;
  draftId: string;
  authorUserId: string;
  title?: string;
  bodyMarkdown?: string;
}): Promise<WorkshopDocument | null> {
  const page = await prisma.wikiPage.findFirst({
    where: { id: input.draftId, campaignId: input.campaignId, deletedAt: null },
    select: {
      id: true,
      campaignId: true,
      title: true,
      blocks: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!page || !isWorkshopDraftMetadata(page.metadata)) return null;
  if (page.metadata.authorUserId !== input.authorUserId) return null;
  if (page.metadata.draftStatus !== 'active') return null;

  const nextBlocks =
    input.bodyMarkdown !== undefined
      ? setWorkshopDraftMarkdown(page.blocks, input.bodyMarkdown)
      : (page.blocks as Array<Record<string, unknown>>);

  const updated = await prisma.wikiPage.update({
    where: { id: page.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() || 'Untitled' } : {}),
      ...(input.bodyMarkdown !== undefined ? { blocks: nextBlocks as never } : {}),
    },
    select: {
      id: true,
      campaignId: true,
      title: true,
      blocks: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (input.bodyMarkdown !== undefined) {
    await syncWikiLinksForSourcePage(prisma, {
      campaignId: input.campaignId,
      sourcePageId: page.id,
      blocks: nextBlocks,
      actorUserId: input.authorUserId,
      emitEvents: false,
    });

    const { wordCount, characterCount } = countWordsInBlocks(nextBlocks);
    const now = new Date();
    await prisma.wikiPageStats.upsert({
      where: { pageId: page.id },
      create: {
        campaignId: input.campaignId,
        pageId: page.id,
        wordCount,
        characterCount,
        editCount: 1,
        firstCreatedAt: now,
        lastEditedAt: now,
        lastEditedByUserId: input.authorUserId,
      },
      update: {
        wordCount,
        characterCount,
        editCount: { increment: 1 },
        lastEditedAt: now,
        lastEditedByUserId: input.authorUserId,
      },
    });
  }

  return toWorkshopDocument(updated);
}

export async function formalizeWorkshopDraft(input: {
  campaignId: string;
  draftId: string;
  authorUserId: string;
  target: WorkshopFormalizeTarget;
  title: string;
  summary?: string | null;
  loreParentId?: string | null;
  linkedQuestPageId?: string | null;
}): Promise<{ formalizedPageId: string; target: WorkshopFormalizeTarget } | null> {
  const page = await prisma.wikiPage.findFirst({
    where: { id: input.draftId, campaignId: input.campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      blocks: true,
      metadata: true,
      templateType: true,
    },
  });
  if (!page || !isWorkshopDraftMetadata(page.metadata)) return null;
  if (page.metadata.authorUserId !== input.authorUserId) return null;
  if (page.metadata.draftStatus !== 'active') return null;

  const nextTitle = input.title.trim() || page.title;
  const bodyMarkdown = extractWorkshopDraftMarkdown(page.blocks);
  const parentId = await resolveFormalizeParentId(
    input.campaignId,
    input.target,
    input.loreParentId,
  );
  const shell = buildFormalizeShell({
    target: input.target,
    bodyMarkdown,
    summary: input.summary,
    linkedQuestPageId: input.linkedQuestPageId,
  });

  await prisma.wikiPage.update({
    where: { id: page.id },
    data: {
      title: nextTitle,
      parentId,
      templateType: shell.templateType,
      blocks: shell.blocks as never,
      metadata: shell.metadata as never,
    },
  });

  await syncWikiLinksForSourcePage(prisma, {
    campaignId: input.campaignId,
    sourcePageId: page.id,
    blocks: shell.blocks,
    actorUserId: input.authorUserId,
    emitEvents: true,
  });

  return { formalizedPageId: page.id, target: input.target };
}
