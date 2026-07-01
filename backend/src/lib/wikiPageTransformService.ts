import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { CampaignWorkspace } from '../../../shared/campaignWorkspace.js';
import {
  buildEventLorePromoteStubMarkdown,
  buildEventLoreQuestBlocks,
  buildTransformedPagePayload,
  isAllowedTransform,
  type WikiBlockLike,
} from '../../../shared/pageTransform.js';
import {
  isEventLorePageId,
  isSameModuleScope,
  resolvePageModuleScope,
  resolvePageSurfaceKey,
  resolveTargetModuleAnchorPageId,
  type PageModuleInput,
} from '../../../shared/pageModuleScope.js';
import { initialQuestLifecycleFromWikiVisibility } from '../../../shared/narrativeLifecycle.js';
import { prisma } from './prisma.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import { ensureNarrativeThreadsSystemCategoryKey } from './ensureNarrativeThreadsSystemCategoryKey.js';
import { assignPathKeyForNewPage, loadCampaignWikiPathKeyRows } from './wikiPathKeyService.js';
import { syncWikiLinksForSourcePage } from './wikiLinkService.js';
import {
  createDefaultQuestLifecycle,
  createDefaultThreadLifecycle,
} from './narrativeLifecycleService.js';
import { resolveDefaultPageOwnership } from './pageOwnershipDefaults.js';
import type { CampaignMemberRole } from '../types/domain.js';

type Tx = Prisma.TransactionClient;

export type TransformWikiPageResult = {
  pageId: string;
  promotedQuestPageId?: string;
  workspace: CampaignWorkspace | null;
  pathKey: string | null;
};

function asBlocks(raw: unknown): WikiBlockLike[] {
  if (!Array.isArray(raw)) return [];
  return raw as WikiBlockLike[];
}

export function assertSameModuleParent(
  page: PageModuleInput,
  parent: PageModuleInput | null,
  flatPages: readonly PageModuleInput[],
): void {
  const pageScope = resolvePageModuleScope(page, flatPages);
  if (pageScope.moduleKey === 'pages') return;
  if (pageScope.moduleKey === 'event-lore') return;

  if (!parent) {
    throw new Error('Parent is required within this module. Use Transform to move between modules.');
  }

  const parentScope = resolvePageModuleScope(parent, flatPages);
  if (!isSameModuleScope(pageScope, parentScope)) {
    throw new Error('Parent must stay within the same module. Use Transform to move between modules.');
  }
}

export async function transformWikiPageInCampaign(input: {
  campaignId: string;
  pageId: string;
  targetModuleKey: string;
  actorUserId?: string;
  actorRole?: CampaignMemberRole | null;
  partyId?: string | null;
}): Promise<TransformWikiPageResult> {
  const { campaignId, pageId, targetModuleKey, actorUserId, actorRole, partyId } = input;
  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      templateType: true,
      metadata: true,
      blocks: true,
      visibility: true,
      workspace: true,
      pathKey: true,
    },
  });

  if (!page) {
    throw new Error('Page not found');
  }

  const flatPages = await loadCampaignWikiPathKeyRows(campaignId);
  const sourceSurfaceKey = resolvePageSurfaceKey(page, flatPages);

  if (!isAllowedTransform(sourceSurfaceKey, targetModuleKey)) {
    throw new Error('Transform is not allowed for this page and target module.');
  }

  if (isEventLorePageId(page.id) && targetModuleKey === 'quests') {
    return promoteEventLoreToQuest({
      campaignId,
      page,
      flatPages,
      actorUserId,
      actorRole,
      partyId,
    });
  }

  const transformed = buildTransformedPagePayload({
    sourceSurfaceKey,
    targetModuleKey: targetModuleKey as 'characters' | 'bestiary' | 'quests' | 'threads',
    blocks: asBlocks(page.blocks),
    metadata: page.metadata,
  });

  const anchorParentId = resolveTargetModuleAnchorPageId(flatPages, targetModuleKey);
  if (!anchorParentId) {
    throw new Error('Target module folder is not available in this campaign.');
  }

  const nextPageInput: PageModuleInput = {
    id: page.id,
    title: page.title,
    parentId: anchorParentId,
    templateType: transformed.templateType,
    metadata: transformed.metadata,
  };

  const { workspace, pathKey } = await assignPathKeyForNewPage(
    campaignId,
    nextPageInput,
    flatPages.map((row) =>
      row.id === page.id
        ? { ...row, ...nextPageInput }
        : row,
    ),
  );

  await prisma.$transaction(async (tx) => {
    await tx.wikiPage.update({
      where: { id: page.id },
      data: {
        parentId: anchorParentId,
        templateType: transformed.templateType,
        metadata: transformed.metadata as never,
        blocks: transformed.blocks as never,
        workspace,
        pathKey,
      },
    });
  });

  await syncWikiLinksForSourcePage(prisma, {
    campaignId,
    sourcePageId: page.id,
    blocks: transformed.blocks,
    actorUserId,
    emitEvents: true,
  });

  if (targetModuleKey === 'quests') {
    await ensureQuestsSystemCategoryKey(campaignId);
    await createDefaultQuestLifecycle(campaignId, page.id, {
      initialState: initialQuestLifecycleFromWikiVisibility({
        visibility: page.visibility,
        questStatus: 'AVAILABLE',
      }),
      actorUserId,
    });
  }

  if (targetModuleKey === 'threads') {
    await ensureNarrativeThreadsSystemCategoryKey(campaignId);
    await createDefaultThreadLifecycle(campaignId, page.id, {
      actorUserId,
    });
  }

  return {
    pageId: page.id,
    workspace: workspace as CampaignWorkspace | null,
    pathKey,
  };
}

async function promoteEventLoreToQuest(input: {
  campaignId: string;
  page: {
    id: string;
    title: string;
    blocks: unknown;
    metadata: unknown;
    visibility: string;
  };
  flatPages: PageModuleInput[];
  actorUserId?: string;
  actorRole?: CampaignMemberRole | null;
  partyId?: string | null;
}): Promise<TransformWikiPageResult> {
  const { campaignId, page, flatPages, actorUserId, actorRole, partyId } = input;
  const questsRootId = await ensureQuestsSystemCategoryKey(campaignId);
  if (!questsRootId) {
    throw new Error('Quests folder is not available in this campaign.');
  }

  const loreMarkdown = asBlocks(page.blocks)
    .filter((block) => block.type === 'text-tiptap')
    .map((block) =>
      typeof block.content?.markdown === 'string' ? block.content.markdown : '',
    )
    .find((markdown) => markdown.trim()) ?? '';

  const questBlocks = buildEventLoreQuestBlocks(page.title, loreMarkdown);
  const newQuestId = randomUUID();

  const questPageInput: PageModuleInput = {
    id: newQuestId,
    title: page.title,
    parentId: questsRootId,
    templateType: 'QUEST',
    metadata: {
      entityCategory: 'quests',
      questStatus: 'AVAILABLE',
      promotedFromEventLorePageId: page.id,
    },
  };

  const { workspace, pathKey } = await assignPathKeyForNewPage(
    campaignId,
    questPageInput,
    [...flatPages, questPageInput],
  );

  const ownership = actorUserId
    ? resolveDefaultPageOwnership({
        creatorUserId: actorUserId,
        creatorRole: actorRole ?? null,
        defaultPartyId: partyId ?? null,
        workspace,
        templateType: 'QUEST',
      })
    : {
        ownerType: 'STAFF' as const,
        ownerUserId: null,
        ownerPartyId: null,
        createdByUserId: null,
      };

  await prisma.$transaction(async (tx: Tx) => {
    await tx.wikiPage.create({
      data: {
        id: newQuestId,
        campaignId,
        title: page.title,
        parentId: questsRootId,
        templateType: 'QUEST',
        metadata: questPageInput.metadata as never,
        blocks: questBlocks as never,
        visibility: page.visibility,
        workspace,
        pathKey,
        ownerType: ownership.ownerType,
        ownerUserId: ownership.ownerUserId,
        ownerPartyId: ownership.ownerPartyId,
        createdByUserId: ownership.createdByUserId,
      },
    });

    const stubMarkdown = buildEventLorePromoteStubMarkdown(newQuestId, page.title);
    const stubBlocks = [
      {
        id: randomUUID(),
        type: 'text-tiptap',
        title: 'Description',
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        content: { markdown: stubMarkdown },
        isPrivate: false,
        visibility: 'Party',
      },
    ];

    const existingMetadata =
      page.metadata && typeof page.metadata === 'object'
        ? { ...(page.metadata as Record<string, unknown>) }
        : {};

    await tx.wikiPage.update({
      where: { id: page.id },
      data: {
        blocks: stubBlocks as never,
        metadata: {
          ...existingMetadata,
          promotedQuestPageId: newQuestId,
        } as never,
      },
    });
  });

  await syncWikiLinksForSourcePage(prisma, {
    campaignId,
    sourcePageId: newQuestId,
    blocks: questBlocks,
    actorUserId,
    emitEvents: true,
  });

  await createDefaultQuestLifecycle(campaignId, newQuestId, {
    initialState: initialQuestLifecycleFromWikiVisibility({
      visibility: page.visibility,
      questStatus: 'AVAILABLE',
    }),
    actorUserId,
  });

  return {
    pageId: page.id,
    promotedQuestPageId: newQuestId,
    workspace: workspace as CampaignWorkspace | null,
    pathKey,
  };
}

export async function validateWikiParentModuleScope(
  campaignId: string,
  pageId: string,
  parentId: string | null,
): Promise<void> {
  const flatPages = await loadCampaignWikiPathKeyRows(campaignId);
  const page = flatPages.find((row) => row.id === pageId);
  if (!page) throw new Error('Page not found');

  if (parentId === null) {
    const scope = resolvePageModuleScope(page, flatPages);
    if (scope.moduleKey !== 'pages' && scope.moduleKey !== 'event-lore') {
      throw new Error('Parent is required within this module. Use Transform to move between modules.');
    }
    return;
  }

  const parent = flatPages.find((row) => row.id === parentId);
  if (!parent) throw new Error('Parent page not found');

  assertSameModuleParent(page, parent, flatPages);
}
