import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

async function assertMembership(userId: string, campaignId: string): Promise<boolean> {
  const member = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { userId: true },
  });
  return member != null;
}

export async function pinCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const campaignId = String(req.params.campaignId ?? '');
  if (!campaignId) {
    res.status(400).json({ error: 'campaignId required' });
    return;
  }

  if (!(await assertMembership(userId, campaignId))) {
    res.status(403).json({ error: 'Not a member of this campaign' });
    return;
  }

  const existing = await prisma.userCampaignPin.findMany({
    where: { userId },
    select: { sortOrder: true },
    orderBy: { sortOrder: 'desc' },
    take: 1,
  });
  const nextOrder = (existing[0]?.sortOrder ?? -1) + 1;

  await prisma.userCampaignPin.upsert({
    where: { userId_campaignId: { userId, campaignId } },
    create: { userId, campaignId, sortOrder: nextOrder },
    update: {},
  });

  res.json({ ok: true });
}

export async function unpinCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const campaignId = String(req.params.campaignId ?? '');
  if (!campaignId) {
    res.status(400).json({ error: 'campaignId required' });
    return;
  }

  await prisma.userCampaignPin.deleteMany({
    where: { userId, campaignId },
  });

  res.json({ ok: true });
}

export async function reorderCampaignPins(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const orderedCampaignIds = req.body?.orderedCampaignIds;
  if (!Array.isArray(orderedCampaignIds)) {
    res.status(400).json({ error: 'orderedCampaignIds array required' });
    return;
  }

  await prisma.$transaction(
    orderedCampaignIds.map((campaignId: string, index: number) =>
      prisma.userCampaignPin.updateMany({
        where: { userId, campaignId },
        data: { sortOrder: index },
      }),
    ),
  );

  res.json({ ok: true });
}
