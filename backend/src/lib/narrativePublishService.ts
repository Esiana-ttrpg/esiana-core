import type { Prisma } from '@prisma/client';
import {
  NarrativeLifecycleStates,
  NarrativeLifecycleSubjectKinds,
} from '../../../shared/narrativeLifecycle.js';
import {
  projectPublishedNarrative,
  type PublishedNarrativeArtifact,
} from '../../../shared/narrativeProjection.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { buildNarrativeViewerContextFromCampaign } from './narrativeProjectionContext.js';
import { transitionLifecycle } from './narrativeLifecycleService.js';
import { parseQuestMetadata, mergeQuestMetadata } from './questMetadata.js';
import { prisma } from './prisma.js';
import { CampaignMemberRoles } from '../types/domain.js';

type WikiBlock = Record<string, unknown>;

function stripDmOnlyBlocks(blocks: unknown): WikiBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((block) => {
    if (!block || typeof block !== 'object') return false;
    const type = (block as { type?: unknown }).type;
    if (type === 'dmSecret' || type === 'dmOnly' || type === 'dm_note') return false;
    return true;
  }) as WikiBlock[];
}

export async function previewQuestPublication(
  campaignId: string,
  questPageId: string,
  role: string | null,
): Promise<PublishedNarrativeArtifact> {
  const page = await prisma.wikiPage.findFirst({
    where: { id: questPageId, campaignId },
    select: { blocks: true, metadata: true, visibility: true },
  });
  if (!page) throw new Error('PAGE_NOT_FOUND');

  const partyCtx = await buildNarrativeViewerContextFromCampaign(
    campaignId,
    CampaignMemberRoles.PARTICIPANT,
  );

  return projectPublishedNarrative({
    subjectKind: 'quest',
    blocks: page.blocks,
    metadata: page.metadata,
    visibility: page.visibility,
    viewerContext: partyCtx,
    lifecycleState: NarrativeLifecycleStates.LOCKED,
  });
}

export async function publishQuestToParty(
  input: {
    campaignId: string;
    questPageId: string;
    actorUserId: string;
    canManage: boolean;
    entityName?: string;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ lifecycleState: string; blocks: WikiBlock[] }> {
  if (!input.canManage) throw new Error('FORBIDDEN');

  const page = await db.wikiPage.findFirst({
    where: { id: input.questPageId, campaignId: input.campaignId },
    select: { blocks: true, metadata: true, visibility: true, title: true },
  });
  if (!page) throw new Error('PAGE_NOT_FOUND');

  const partyCtx = await buildNarrativeViewerContextFromCampaign(
    input.campaignId,
    CampaignMemberRoles.PARTICIPANT,
  );

  const artifact = projectPublishedNarrative({
    subjectKind: 'quest',
    blocks: page.blocks,
    metadata: page.metadata,
    visibility: page.visibility,
    viewerContext: partyCtx,
    lifecycleState: NarrativeLifecycleStates.LOCKED,
  });

  const sanitizedBlocks = stripDmOnlyBlocks(artifact.blocks);

  await transitionLifecycle(
    {
      campaignId: input.campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
      subjectId: input.questPageId,
      toState: NarrativeLifecycleStates.DISCOVERED,
      actorUserId: input.actorUserId,
      canManage: input.canManage,
      entityName: input.entityName ?? undefined,
    },
    db,
  );

  const merged = mergeQuestMetadata(page.metadata, {
    questStatus: 'AVAILABLE',
  });
  await db.wikiPage.update({
    where: { id: input.questPageId },
    data: {
      blocks: sanitizedBlocks as never,
      metadata: merged as never,
    },
  });

  return {
    lifecycleState: NarrativeLifecycleStates.DISCOVERED,
    blocks: sanitizedBlocks,
  };
}
