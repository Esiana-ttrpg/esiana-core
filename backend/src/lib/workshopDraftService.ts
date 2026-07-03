import type { Prisma } from '@prisma/client';
import type { AuthoringContextKind } from '../../../shared/authoringContext.js';
import {
  type WorkshopDocument,
  type WorkshopDraftMetadata,
  type WorkshopFieldShadow,
  type WorkshopFormalizeTarget,
  buildWorkshopDraftMetadata,
  isWorkshopDraftMetadata,
  isWorkshopDraftsRootMetadata,
  resolveWorkshopDraftBinding,
} from '../../../shared/workshopDocument.js';
import { workshopFormalizeDefaultDraftTitle } from '../../../shared/workshopFormalize.js';
import { ensureWorkshopDraftsRoot } from './ensureWorkshopDraftsRoot.js';
import { buildFieldShadowShell, buildFormalizeShell } from './workshopFormalizeShells.js';
import { resolveFormalizeParentId } from './workshopFormalizeRoots.js';
import {
  applyProseToPageBlocks,
  buildWorkshopDraftBlocks,
  extractFieldShadowFromMetadata,
  extractPrimaryProseFromPageBlocks,
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
    binding: resolveWorkshopDraftBinding(meta),
    anchorEntityIds: meta.anchorEntityIds,
    sourceKind: meta.sourceKind,
    intendedTarget: meta.intendedTarget,
    fieldShadow: extractFieldShadowFromMetadata(meta) ?? meta.fieldShadow ?? null,
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

async function seedBodyFromAnchor(input: {
  campaignId: string;
  anchorEntityId: string;
}): Promise<string> {
  const anchor = await prisma.wikiPage.findFirst({
    where: { id: input.anchorEntityId, campaignId: input.campaignId, deletedAt: null },
    select: { blocks: true },
  });
  if (!anchor) return '';
  return extractPrimaryProseFromPageBlocks(anchor.blocks);
}

export async function createWorkshopDraft(input: {
  campaignId: string;
  authorUserId: string;
  title?: string;
  bodyMarkdown?: string;
  anchorEntityIds?: string[];
  sourceKind?: AuthoringContextKind;
  intendedTarget?: WorkshopFormalizeTarget;
}): Promise<WorkshopDocument> {
  const rootId = await ensureWorkshopDraftsRoot(input.campaignId);

  let bodyMarkdown = input.bodyMarkdown ?? '';
  if (!bodyMarkdown && input.anchorEntityIds?.[0] && !input.intendedTarget) {
    bodyMarkdown = await seedBodyFromAnchor({
      campaignId: input.campaignId,
      anchorEntityId: input.anchorEntityIds[0],
    });
  }

  let fieldShadow: WorkshopFieldShadow | undefined;
  if (input.intendedTarget && !input.anchorEntityIds?.length) {
    const shell = buildFieldShadowShell({ target: input.intendedTarget });
    fieldShadow = {
      intendedTarget: input.intendedTarget,
      templateType: shell.templateType,
      blocks: shell.blocks,
      metadata: shell.metadata,
    };
  }

  const metadata = buildWorkshopDraftMetadata({
    authorUserId: input.authorUserId,
    anchorEntityIds: input.anchorEntityIds,
    sourceKind: input.sourceKind,
    intendedTarget: input.intendedTarget,
    fieldShadow,
    draftOriginSurface: 'workshop',
  });

  const defaultTitle =
    input.title?.trim() ||
    (input.intendedTarget
      ? workshopFormalizeDefaultDraftTitle(input.intendedTarget)
      : 'Untitled');

  const page = await prisma.wikiPage.create({
    data: {
      campaignId: input.campaignId,
      title: defaultTitle,
      parentId: rootId,
      visibility: WikiVisibility.DM_ONLY,
      templateType: fieldShadow?.templateType ?? 'DEFAULT',
      metadata: metadata as never,
      blocks: buildWorkshopDraftBlocks(bodyMarkdown) as never,
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
  fieldShadow?: WorkshopFieldShadow;
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
  const draftMeta = page.metadata as WorkshopDraftMetadata;
  if (draftMeta.authorUserId !== input.authorUserId) return null;
  if (draftMeta.draftStatus !== 'active') return null;

  const nextBlocks =
    input.bodyMarkdown !== undefined
      ? setWorkshopDraftMarkdown(page.blocks, input.bodyMarkdown)
      : (page.blocks as Array<Record<string, unknown>>);

  const nextMetadata: WorkshopDraftMetadata = { ...draftMeta };
  if (input.fieldShadow !== undefined) {
    nextMetadata.fieldShadow = input.fieldShadow;
    if (input.fieldShadow.intendedTarget) {
      nextMetadata.intendedTarget = input.fieldShadow.intendedTarget;
    }
  }

  const updated = await prisma.wikiPage.update({
    where: { id: page.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() || 'Untitled' } : {}),
      ...(input.bodyMarkdown !== undefined ? { blocks: nextBlocks as never } : {}),
      ...(input.fieldShadow !== undefined
        ? {
            metadata: nextMetadata as never,
            templateType: input.fieldShadow.templateType,
          }
        : {}),
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

export async function applyWorkshopDraftToPage(input: {
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
  if (!page || !isWorkshopDraftMetadata(page.metadata)) return null;
  const draftMeta = page.metadata as WorkshopDraftMetadata;
  if (draftMeta.authorUserId !== input.authorUserId) return null;
  if (draftMeta.draftStatus !== 'active') return null;

  const anchorId = draftMeta.anchorEntityIds?.[0];
  if (!anchorId) return null;

  const bodyMarkdown = extractWorkshopDraftMarkdown(page.blocks);
  const anchor = await prisma.wikiPage.findFirst({
    where: { id: anchorId, campaignId: input.campaignId, deletedAt: null },
    select: { id: true, blocks: true },
  });
  if (!anchor) return null;

  const nextBlocks = applyProseToPageBlocks(anchor.blocks, bodyMarkdown);
  if (!nextBlocks) return null;

  await prisma.wikiPage.update({
    where: { id: anchor.id },
    data: { blocks: nextBlocks as never },
  });

  await syncWikiLinksForSourcePage(prisma, {
    campaignId: input.campaignId,
    sourcePageId: anchor.id,
    blocks: nextBlocks,
    actorUserId: input.authorUserId,
    emitEvents: true,
  });

  const nextMeta: WorkshopDraftMetadata = {
    ...draftMeta,
    lastAppliedAt: new Date().toISOString(),
  };
  const updatedDraft = await prisma.wikiPage.update({
    where: { id: page.id },
    data: { metadata: nextMeta as never },
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

  return toWorkshopDocument(updatedDraft);
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
  const fieldShadow = extractFieldShadowFromMetadata(page.metadata);

  const parentId = await resolveFormalizeParentId(
    input.campaignId,
    input.target,
    input.loreParentId,
  );

  let shell: {
    templateType: string;
    blocks: Array<Record<string, unknown>>;
    metadata: Record<string, unknown>;
  };

  if (fieldShadow && fieldShadow.blocks.length > 0) {
    const proseShell = buildFormalizeShell({
      target: input.target,
      bodyMarkdown,
      summary: input.summary,
      linkedQuestPageId: input.linkedQuestPageId,
    });
    const nonProseFromShadow = fieldShadow.blocks;
    const proseBlocks = proseShell.blocks.filter(
      (b) => b.type === 'text-tiptap' || b.type === 'text-biography',
    );
    shell = {
      templateType: fieldShadow.templateType || proseShell.templateType,
      blocks: [...nonProseFromShadow, ...proseBlocks],
      metadata: { ...fieldShadow.metadata, ...proseShell.metadata },
    };
  } else {
    shell = buildFormalizeShell({
      target: input.target,
      bodyMarkdown,
      summary: input.summary,
      linkedQuestPageId: input.linkedQuestPageId,
    });
  }

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

export async function findOrCreateAnchoredDraft(input: {
  campaignId: string;
  authorUserId: string;
  anchorPageId: string;
  sourceKind?: AuthoringContextKind;
}): Promise<WorkshopDocument> {
  const existing = await listWorkshopDrafts({
    campaignId: input.campaignId,
    authorUserId: input.authorUserId,
    anchorEntityId: input.anchorPageId,
    status: 'active',
    limit: 1,
  });
  if (existing[0]) return existing[0];

  const anchor = await prisma.wikiPage.findFirst({
    where: { id: input.anchorPageId, campaignId: input.campaignId, deletedAt: null },
    select: { title: true },
  });

  return createWorkshopDraft({
    campaignId: input.campaignId,
    authorUserId: input.authorUserId,
    title: anchor?.title,
    anchorEntityIds: [input.anchorPageId],
    sourceKind: input.sourceKind,
  });
}
