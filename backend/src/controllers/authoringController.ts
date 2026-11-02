import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  ingestLegacyWritingSession,
  touchWritingSession,
} from '../lib/stats/writing/writingSessionService.js';
import { isSceneMetadataPresent } from '../lib/sceneMetadata.js';
import { parseThreadMetadata } from '../lib/threadMetadata.js';
import { resolveCanonicalEntityCategory } from '../../../shared/resolveCanonicalEntityCategory.js';
import { readEntityCategoryFromMetadata } from '../../../shared/wikiTemplateType.js';

function isCharactersRoot(row: {
  metadata: unknown;
}): boolean {
  if (typeof row.metadata !== 'object' || row.metadata === null) return false;
  const meta = row.metadata as Record<string, unknown>;
  return meta.categoryKey === 'characters' || meta.systemCategoryKey === 'characters';
}
function isQuestLikeMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return (
    raw.questStatus !== undefined ||
    raw.questType !== undefined ||
    raw.boardOrder !== undefined
  );
}

function isActiveQuest(metadata: unknown): boolean {
  if (!isQuestLikeMetadata(metadata)) return false;
  const raw = metadata as Record<string, unknown>;
  const status = typeof raw.questStatus === 'string' ? raw.questStatus.toLowerCase() : '';
  return status !== 'complete' && status !== 'completed' && status !== 'resolved' && status !== 'archived';
}

function isActiveThread(metadata: unknown): boolean {
  const thread = parseThreadMetadata(metadata);
  if (!thread.threadKind) return false;
  const status = (thread.threadStatus ?? 'OPEN').toUpperCase();
  return status === 'OPEN' || status === 'ACTIVE';
}

const CLIENT_INSTANCE_KEY_MAX = 64;
const PAGE_ID_MAX = 128;

function capClientInstanceKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, CLIENT_INSTANCE_KEY_MAX);
}

async function resolveCampaignPageId(
  campaignId: string,
  value: unknown,
): Promise<string | null> {
  if (typeof value !== 'string') return null;
  const pageId = value.trim();
  if (!pageId || pageId.length > PAGE_ID_MAX) return null;
  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId, deletedAt: null },
    select: { id: true },
  });
  return page?.id ?? null;
}

export async function postWritingSession(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const userId = req.user!.id;
  const body = req.body as Record<string, unknown>;

  const pageId = await resolveCampaignPageId(campaignId, body.pageId);
  const pageTitle = typeof body.pageTitle === 'string' ? body.pageTitle.trim() : 'Writing session';
  const clientInstanceKey = capClientInstanceKey(body.clientInstanceKey);
  const kindRaw = typeof body.kind === 'string' ? body.kind.trim() : '';
  const durationMs =
    typeof body.durationMs === 'number' && Number.isFinite(body.durationMs)
      ? Math.max(0, Math.floor(body.durationMs))
      : 0;
  const wordDelta =
    typeof body.wordDelta === 'number' && Number.isFinite(body.wordDelta)
      ? Math.floor(body.wordDelta)
      : 0;
  const linksAdded =
    typeof body.linksAdded === 'number' && Number.isFinite(body.linksAdded)
      ? Math.max(0, Math.floor(body.linksAdded))
      : 0;

  if (!pageId) {
    res.status(400).json({ error: 'pageId is required' });
    return;
  }

  if (clientInstanceKey) {
    const kind = kindRaw === 'interval-end' ? 'interval-end' : 'activity';
    await touchWritingSession(prisma, {
      userId,
      campaignId,
      clientInstanceKey,
      documentId: pageId,
      documentTitle: pageTitle,
      kind,
      focused: body.focused !== false,
      visible: body.visible !== false,
      connected: body.connected !== false,
    });
    res.status(204).end();
    return;
  }

  if (durationMs < 1000 && wordDelta === 0 && linksAdded === 0) {
    res.status(204).end();
    return;
  }

  await ingestLegacyWritingSession(prisma, {
    userId,
    campaignId,
    documentId: pageId,
    durationMs,
  });

  res.status(204).end();
}

export async function getCampaignGrowthMetrics(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;

  const rows = await prisma.wikiPage.findMany({
    where: { campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      templateType: true,
      metadata: true,
    },
  });

  let npcCount = 0;
  let sceneCount = 0;
  let factionCount = 0;
  let activeThreadCount = 0;
  let activeQuestCount = 0;

  const charactersRoot = rows.find(isCharactersRoot);

  const charactersRootId = charactersRoot?.id ?? null;

  for (const row of rows) {
    const entityCategory =
      readEntityCategoryFromMetadata(row.metadata) ??
      resolveCanonicalEntityCategory(row, rows);

    if (entityCategory === 'characters' && row.parentId === charactersRootId) {
      npcCount += 1;
    }
    if (entityCategory === 'organizations') {
      const meta = row.metadata as Record<string, unknown> | null;
      const status = typeof meta?.organizationStatus === 'string' ? meta.organizationStatus : 'ACTIVE';
      if (status === 'ACTIVE') factionCount += 1;
    }
    if (isSceneMetadataPresent(row.metadata)) {
      sceneCount += 1;
    }
    if (isActiveThread(row.metadata)) {
      activeThreadCount += 1;
    }
    if (isQuestLikeMetadata(row.metadata) && isActiveQuest(row.metadata)) {
      activeQuestCount += 1;
    }
  }

  // Fallback NPC count: any character entity if no characters root
  if (npcCount === 0) {
    npcCount = rows.filter(
      (row) =>
        (readEntityCategoryFromMetadata(row.metadata) ??
          resolveCanonicalEntityCategory(row, rows)) === 'characters',
    ).length;
  }

  res.json({
    npcCount,
    activeThreadCount,
    sceneCount,
    factionCount,
    activeQuestCount,
  });
}
