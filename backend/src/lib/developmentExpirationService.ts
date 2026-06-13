import type { Prisma } from '@prisma/client';
import { resolveWorldDevelopmentSettings } from './worldDevelopmentSettingsService.js';

export async function incrementPendingAdvanceCycles(
  tx: Prisma.TransactionClient,
  campaignId: string,
): Promise<number> {
  const result = await tx.campaignWorldEventSuggestion.updateMany({
    where: { campaignId, status: 'pending' },
    data: { advanceCycleCount: { increment: 1 } },
  });
  return result.count;
}

export async function sweepExpiredWorldDevelopments(
  tx: Prisma.TransactionClient,
  campaignId: string,
): Promise<number> {
  const settings = await resolveWorldDevelopmentSettings(campaignId, tx);
  const now = new Date();
  const maxCycles = settings.expiration.maxAdvanceCycles;

  const wallExpired = await tx.campaignWorldEventSuggestion.updateMany({
    where: {
      campaignId,
      status: 'pending',
      expiresAt: { lte: now },
    },
    data: {
      status: 'archived',
      resolvedAt: now,
    },
  });

  const cycleExpired = await tx.campaignWorldEventSuggestion.updateMany({
    where: {
      campaignId,
      status: 'pending',
      advanceCycleCount: { gte: maxCycles },
    },
    data: {
      status: 'archived',
      resolvedAt: now,
    },
  });

  return wallExpired.count + cycleExpired.count;
}

export function computeSuggestionExpiresAt(wallClockDays: number): Date {
  const ms = wallClockDays * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}
