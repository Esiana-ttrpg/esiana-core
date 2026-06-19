import { prisma } from './prisma.js';
import { NotificationType, OwnershipTransferStatus } from './notifications/types.js';
import { notifyUsersFromTemplateAsync } from './notifications/notificationService.js';
import { campaignTransferOwnershipPath } from './notifications/deepLinks.js';

export const OWNERSHIP_TRANSFER_EXPIRY_DAYS = 7;

export function ownershipTransferExpiresAt(fromMs = Date.now()): Date {
  return new Date(fromMs + OWNERSHIP_TRANSFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Hard-expire pending offers whose deadline has passed.
 * Safe to call on every read/write — does not rely on the background sweep alone.
 */
export async function expireStaleOwnershipTransfers(input?: {
  campaignId?: string;
  now?: Date;
  notify?: boolean;
}): Promise<number> {
  const now = input?.now ?? new Date();
  const stale = await prisma.campaignOwnershipTransfer.findMany({
    where: {
      status: OwnershipTransferStatus.PENDING,
      expiresAt: { lte: now },
      ...(input?.campaignId ? { campaignId: input.campaignId } : {}),
    },
    include: {
      campaign: { select: { id: true, handle: true, name: true } },
    },
  });

  if (stale.length === 0) return 0;

  await prisma.campaignOwnershipTransfer.updateMany({
    where: { id: { in: stale.map((row) => row.id) } },
    data: {
      status: OwnershipTransferStatus.EXPIRED,
      resolvedAt: now,
    },
  });

  if (input?.notify !== false) {
    for (const transfer of stale) {
      notifyUsersFromTemplateAsync({
        userIds: [transfer.fromUserId],
        type: NotificationType.OWNERSHIP_TRANSFER_EXPIRED,
        vars: { campaignName: transfer.campaign.name },
        linkUrl: campaignTransferOwnershipPath(transfer.campaign.handle),
        campaignId: transfer.campaign.id,
        metadata: { transferId: transfer.id, hardExpired: true },
      });
    }
  }

  return stale.length;
}

export async function findActivePendingOwnershipTransfer(campaignId: string) {
  await expireStaleOwnershipTransfers({ campaignId, notify: true });
  return prisma.campaignOwnershipTransfer.findFirst({
    where: {
      campaignId,
      status: OwnershipTransferStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function assertOwnershipTransferActionable(
  transferId: string,
  campaignId: string,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'expired' }> {
  await expireStaleOwnershipTransfers({ campaignId, notify: true });

  const row = await prisma.campaignOwnershipTransfer.findFirst({
    where: { id: transferId, campaignId },
  });

  if (!row || row.status !== OwnershipTransferStatus.PENDING) {
    return { ok: false, reason: 'not_found' };
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.campaignOwnershipTransfer.update({
      where: { id: row.id },
      data: {
        status: OwnershipTransferStatus.EXPIRED,
        resolvedAt: new Date(),
      },
    });
    return { ok: false, reason: 'expired' };
  }

  return { ok: true };
}
