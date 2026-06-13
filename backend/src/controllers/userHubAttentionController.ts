import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function dismissHubAttention(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const dismissKey = req.body?.dismissKey;
  const snoozeDays = req.body?.snoozeDays;

  if (typeof dismissKey !== 'string' || !dismissKey.trim()) {
    res.status(400).json({ error: 'dismissKey required' });
    return;
  }

  let snoozeUntil: Date | null = null;
  if (snoozeDays === 7 || snoozeDays === 30) {
    snoozeUntil = new Date(Date.now() + snoozeDays * 24 * 3_600_000);
  }

  await prisma.userHubAttentionDismissal.upsert({
    where: { userId_dismissKey: { userId, dismissKey: dismissKey.trim() } },
    create: {
      userId,
      dismissKey: dismissKey.trim(),
      snoozeUntil,
    },
    update: {
      dismissedAt: new Date(),
      snoozeUntil,
    },
  });

  res.json({ ok: true });
}

export async function restoreHubAttention(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const dismissKey = String(req.params.dismissKey ?? '');
  if (!dismissKey) {
    res.status(400).json({ error: 'dismissKey required' });
    return;
  }

  await prisma.userHubAttentionDismissal.deleteMany({
    where: { userId, dismissKey },
  });

  res.json({ ok: true });
}
