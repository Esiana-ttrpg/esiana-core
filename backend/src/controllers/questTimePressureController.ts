import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  buildQuestExpiryDismissKey,
  mergeQuestTimeRules,
  parseQuestTimePayload,
  writeQuestTimeToMetadata,
} from '../../../shared/questTimeSimulation.js';
import {
  NarrativeLifecycleStates,
  NarrativeLifecycleSubjectKinds,
} from '../../../shared/narrativeLifecycle.js';
import { transitionLifecycle } from '../lib/narrativeLifecycleService.js';
import { touchQuestTimeline } from '../lib/touchQuestTimeline.js';
import { prisma } from '../lib/prisma.js';
import { isElevatedWikiRole } from '../lib/wikiLinkService.js';

type ResolveBody = {
  action: 'fail' | 'extend' | 'dismiss';
  extendEpochMinute?: string | number | null;
};

function canManage(role: string | null): boolean {
  return isElevatedWikiRole(role as import('../types/domain.js').CampaignMemberRole | null);
}

async function loadQuestPage(campaignId: string, pageId: string) {
  return prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId, deletedAt: null },
    select: { id: true, title: true, metadata: true },
  });
}

export async function resolveQuestTimePressure(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManage(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const actorUserId = req.user?.id;
  if (!actorUserId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const pageId = String(req.params.pageId);
  const body = req.body as ResolveBody;
  if (!body?.action || !['fail', 'extend', 'dismiss'].includes(body.action)) {
    res.status(400).json({ error: 'Invalid action' });
    return;
  }

  const page = await loadQuestPage(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Quest not found' });
    return;
  }

  const questTime = parseQuestTimePayload(page.metadata);
  if (!questTime?.rules.expiresAtEpochMinute) {
    res.status(400).json({ error: 'Quest has no authored deadline' });
    return;
  }

  const expiresAt = questTime.rules.expiresAtEpochMinute;

  if (body.action === 'fail') {
    await transitionLifecycle({
      campaignId: ctx.campaignId,
      subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
      subjectId: pageId,
      toState: NarrativeLifecycleStates.FAILED,
      actorUserId,
      canManage: true,
      entityName: page.title,
    });
    res.json({ ok: true, action: 'fail' });
    return;
  }

  if (body.action === 'dismiss') {
    const dismissKey = buildQuestExpiryDismissKey(pageId, expiresAt);
    const existing = await prisma.narrativeConsequenceReceipt.findUnique({
      where: {
        campaignId_idempotencyKey: {
          campaignId: ctx.campaignId,
          idempotencyKey: dismissKey,
        },
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.narrativeConsequenceReceipt.create({
        data: {
          campaignId: ctx.campaignId,
          idempotencyKey: dismissKey,
          ruleId: 'quest-expiry-dismiss',
          subjectId: pageId,
        },
      });
    }
    res.json({ ok: true, action: 'dismiss' });
    return;
  }

  // extend
  const extendRaw = body.extendEpochMinute;
  if (extendRaw == null || extendRaw === '') {
    res.status(400).json({ error: 'extendEpochMinute is required for extend' });
    return;
  }
  const extendEpoch =
    typeof extendRaw === 'number'
      ? Math.floor(extendRaw).toString()
      : String(extendRaw).trim();
  try {
    BigInt(extendEpoch);
  } catch {
    res.status(400).json({ error: 'Invalid extendEpochMinute' });
    return;
  }

  const base =
    page.metadata && typeof page.metadata === 'object'
      ? { ...(page.metadata as Record<string, unknown>) }
      : {};
  const merged = mergeQuestTimeRules(questTime, { expiresAtEpochMinute: extendEpoch });
  await prisma.wikiPage.update({
    where: { id: pageId },
    data: { metadata: writeQuestTimeToMetadata(base, merged) as never },
  });
  res.json({ ok: true, action: 'extend', expiresAtEpochMinute: extendEpoch });
}

export async function touchQuestTimePressureManual(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManage(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const pageId = String(req.params.pageId);
  const page = await loadQuestPage(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Quest not found' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: ctx.campaignId },
    select: { currentEpochMinute: true },
  });

  const touched = await touchQuestTimeline(prisma, {
    campaignId: ctx.campaignId,
    questPageId: pageId,
    epochMinute: campaign?.currentEpochMinute ?? 0n,
    reason: 'MANUAL',
    actorUserId: req.user?.id ?? null,
  });

  res.json({ ok: touched });
}
