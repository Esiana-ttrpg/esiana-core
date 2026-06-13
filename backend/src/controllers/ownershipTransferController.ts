import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  notifyUsersAsync,
  getCampaignMemberUserIds,
} from '../lib/notifications/notificationService.js';
import { NotificationType, OwnershipTransferStatus } from '../lib/notifications/types.js';
import {
  campaignTransferOwnershipPath,
} from '../lib/notifications/deepLinks.js';
import { resolveUserDisplayName } from '../lib/userDisplay.js';
import {
  expireStaleOwnershipTransfers,
  findActivePendingOwnershipTransfer,
  ownershipTransferExpiresAt,
} from '../lib/ownershipTransferExpiry.js';

export async function getOwnershipTransferStatus(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const transfer = await findActivePendingOwnershipTransfer(campaignId);
  if (!transfer) {
    res.json({ transfer: null });
    return;
  }

  const [fromUser, toUser, campaign] = await Promise.all([
    prisma.user.findUnique({
      where: { id: transfer.fromUserId },
      select: { id: true, displayName: true, email: true },
    }),
    prisma.user.findUnique({
      where: { id: transfer.toUserId },
      select: { id: true, displayName: true, email: true },
    }),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true },
    }),
  ]);

  res.json({
    transfer: {
      id: transfer.id,
      status: transfer.status,
      expiresAt: transfer.expiresAt.toISOString(),
      campaignName: campaign?.name ?? 'Campaign',
      fromUser: fromUser
        ? { id: fromUser.id, label: resolveUserDisplayName(fromUser) }
        : null,
      toUser: toUser
        ? { id: toUser.id, label: resolveUserDisplayName(toUser) }
        : null,
    },
  });
}

export async function initiateOwnershipTransfer(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const slug = req.campaign!.campaignHandle;
  const callerId = req.user!.id;
  const targetUserId = String((req.body as { targetUserId?: string }).targetUserId ?? '').trim();

  if (!targetUserId) {
    res.status(400).json({ error: 'targetUserId is required' });
    return;
  }

  if (!req.campaign!.isCampaignOwner) {
    res.status(403).json({ error: 'Only the campaign owner can initiate ownership transfer' });
    return;
  }

  if (targetUserId === callerId) {
    res.status(400).json({ error: 'Cannot transfer ownership to yourself' });
    return;
  }

  const targetMember = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: { userId: targetUserId, campaignId },
    },
    select: {
      role: true,
      user: { select: { displayName: true, email: true } },
    },
  });

  if (!targetMember) {
    res.status(400).json({ error: 'Target must be an existing campaign member' });
    return;
  }

  const existingPending = await findActivePendingOwnershipTransfer(campaignId);
  if (existingPending) {
    res.status(409).json({ error: 'A pending ownership transfer already exists for this campaign' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true },
  });

  const transfer = await prisma.campaignOwnershipTransfer.create({
    data: {
      campaignId,
      fromUserId: callerId,
      toUserId: targetUserId,
      status: OwnershipTransferStatus.PENDING,
      expiresAt: ownershipTransferExpiresAt(),
    },
  });

  notifyUsersAsync({
    userIds: [targetUserId],
    type: NotificationType.OWNERSHIP_TRANSFER_OFFERED,
    title: `Campaign ownership transfer: ${campaign?.name ?? 'Campaign'}`,
    body: `${resolveUserDisplayName({ displayName: req.user!.displayName ?? null, email: req.user!.email })} wants to transfer campaign ownership to you.`,
    linkUrl: campaignTransferOwnershipPath(slug ?? ''),
    campaignId,
    metadata: { transferId: transfer.id },
  });

  res.status(201).json({
    transfer: {
      id: transfer.id,
      status: transfer.status,
      expiresAt: transfer.expiresAt.toISOString(),
    },
  });
}

export async function acceptOwnershipTransfer(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const slug = req.campaign!.campaignHandle;
  const callerId = req.user!.id;

  await expireStaleOwnershipTransfers({ campaignId, notify: true });

  const transfer = await prisma.campaignOwnershipTransfer.findFirst({
    where: {
      campaignId,
      status: OwnershipTransferStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!transfer) {
    res.status(404).json({
      error: 'No pending ownership transfer found',
      code: 'TRANSFER_EXPIRED_OR_MISSING',
    });
    return;
  }

  if (transfer.toUserId !== callerId) {
    res.status(403).json({ error: 'Only the offered recipient can accept this transfer' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.campaignOwnershipTransfer.findFirst({
        where: {
          id: transfer.id,
          status: OwnershipTransferStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      });
      if (!locked) throw new Error('TRANSFER_EXPIRED');

      await tx.campaign.update({
        where: { id: campaignId },
        data: { campaignOwnerUserId: locked.toUserId },
      });

      await tx.campaignOwnershipTransfer.update({
        where: { id: locked.id },
        data: {
          status: OwnershipTransferStatus.ACCEPTED,
          resolvedAt: new Date(),
        },
      });

      await tx.campaignOwnershipTransfer.updateMany({
        where: {
          campaignId,
          status: OwnershipTransferStatus.PENDING,
          id: { not: locked.id },
        },
        data: {
          status: OwnershipTransferStatus.CANCELLED,
          resolvedAt: new Date(),
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'TRANSFER_EXPIRED') {
      await expireStaleOwnershipTransfers({ campaignId, notify: true });
      res.status(410).json({
        error: 'This ownership transfer offer has expired',
        code: 'TRANSFER_EXPIRED',
      });
      return;
    }
    throw error;
  }

  const memberIds = await getCampaignMemberUserIds(campaignId);
  notifyUsersAsync({
    userIds: memberIds,
    type: NotificationType.OWNERSHIP_TRANSFER_COMPLETED,
    title: `${campaign?.name ?? 'Campaign'} has a new campaign owner`,
    body: 'Campaign ownership was transferred after acceptance.',
    linkUrl: campaignTransferOwnershipPath(slug ?? ''),
    campaignId,
  });

  res.json({ ok: true });
}

export async function declineOwnershipTransfer(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const callerId = req.user!.id;

  const transfer = await findActivePendingOwnershipTransfer(campaignId);
  if (!transfer) {
    res.status(404).json({
      error: 'No pending ownership transfer found',
      code: 'TRANSFER_EXPIRED_OR_MISSING',
    });
    return;
  }

  if (transfer.toUserId !== callerId) {
    res.status(403).json({ error: 'Only the offered recipient can decline this transfer' });
    return;
  }

  await prisma.campaignOwnershipTransfer.update({
    where: { id: transfer.id },
    data: {
      status: OwnershipTransferStatus.DECLINED,
      resolvedAt: new Date(),
    },
  });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true },
  });

  notifyUsersAsync({
    userIds: [transfer.fromUserId],
    type: NotificationType.OWNERSHIP_TRANSFER_DECLINED,
    title: `Ownership transfer declined: ${campaign?.name ?? 'Campaign'}`,
    body: 'The offered member declined campaign ownership transfer.',
    linkUrl: campaignTransferOwnershipPath(req.campaign!.campaignHandle ?? ''),
    campaignId,
  });

  res.json({ ok: true });
}

export async function cancelOwnershipTransfer(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const callerId = req.user!.id;

  const transfer = await findActivePendingOwnershipTransfer(campaignId);
  if (!transfer) {
    res.status(404).json({
      error: 'No pending ownership transfer found',
      code: 'TRANSFER_EXPIRED_OR_MISSING',
    });
    return;
  }

  if (transfer.fromUserId !== callerId) {
    res.status(403).json({ error: 'Only the initiating campaign owner can cancel this transfer' });
    return;
  }

  await prisma.campaignOwnershipTransfer.update({
    where: { id: transfer.id },
    data: {
      status: OwnershipTransferStatus.CANCELLED,
      resolvedAt: new Date(),
    },
  });

  res.json({ ok: true });
}

export async function expireOwnershipTransfers(): Promise<number> {
  return expireStaleOwnershipTransfers({ notify: true });
}
