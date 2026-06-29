import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { logCampaignActivity } from '../lib/campaignActivity.js';
import { incrementDailyRollup } from '../lib/stats/userWritingDailyRollup.js';
import { isSceneMetadataPresent } from '../lib/sceneMetadata.js';
import { parseThreadMetadata } from '../lib/threadMetadata.js';
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

export async function postWritingSession(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const userId = req.user!.id;
  const body = req.body as Record<string, unknown>;

  const pageId = typeof body.pageId === 'string' ? body.pageId.trim() : '';
  const pageTitle = typeof body.pageTitle === 'string' ? body.pageTitle.trim() : 'Writing session';
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

  if (durationMs < 1000 && wordDelta === 0 && linksAdded === 0) {
    res.status(204).end();
    return;
  }

  logCampaignActivity({
    campaignId,
    userId,
    actionType: 'UPDATE',
    entityType: 'WRITING_SESSION',
    entityId: pageId,
    entityName: pageTitle,
    parentContext: JSON.stringify({
      durationMs,
      wordDelta,
      linksAdded,
    }),
    deltaBytes: wordDelta > 0 ? wordDelta : null,
  });

  const sessionAt = new Date();
  await incrementDailyRollup(prisma, {
    userId,
    at: sessionAt,
    wordsAdded: Math.max(0, wordDelta),
    wordsRemoved: Math.abs(Math.min(0, wordDelta)),
    linksCreated: linksAdded,
    sessionCount: 1,
    sessionMinutes: Math.max(1, Math.round(durationMs / 60_000)),
    sessionHourUtc: sessionAt.getUTCHours(),
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

  const charactersRoot = rows.find(
    (p) =>
      p.templateType === 'CHARACTER' ||
      (typeof p.metadata === 'object' &&
        p.metadata !== null &&
        (p.metadata as Record<string, unknown>).categoryKey === 'characters'),
  );

  const charactersRootId = charactersRoot?.id ?? null;

  for (const row of rows) {
    if (row.templateType === 'CHARACTER' && row.parentId === charactersRootId) {
      npcCount += 1;
    }
    if (row.templateType === 'ORGANIZATION') {
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

  // Fallback NPC count: any CHARACTER template if no characters root
  if (npcCount === 0) {
    npcCount = rows.filter((r) => r.templateType === 'CHARACTER').length;
  }

  res.json({
    npcCount,
    activeThreadCount,
    sceneCount,
    factionCount,
    activeQuestCount,
  });
}
