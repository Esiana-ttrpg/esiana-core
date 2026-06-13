import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const DEFAULT_DAILY_LIMIT = 50_000;

function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function buildQuotaPayload(used: number, now = new Date()) {
  const windowStart = startOfUtcDay(now);
  const windowEnd = new Date(windowStart.getTime() + 86_400_000);
  const resetInMs = Math.max(0, windowEnd.getTime() - now.getTime());

  return {
    window: {
      start: windowStart.toISOString(),
      end: windowEnd.toISOString(),
      resetInMs,
      timezone: 'UTC' as const,
    },
    quota: {
      used,
      limit: DEFAULT_DAILY_LIMIT,
      remaining: Math.max(0, DEFAULT_DAILY_LIMIT - used),
      usagePct:
        DEFAULT_DAILY_LIMIT > 0
          ? Math.min(1, used / DEFAULT_DAILY_LIMIT)
          : 0,
    },
  };
}

export async function getUserDeveloperQuota(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const now = new Date();
  const windowStart = startOfUtcDay(now);
  const windowEnd = new Date(windowStart.getTime() + 86_400_000);

  const used = await prisma.apiRequestLog.count({
    where: {
      userId,
      apiTokenId: { not: null },
      createdAt: { gte: windowStart, lt: windowEnd },
    },
  });

  res.json(buildQuotaPayload(used, now));
}
