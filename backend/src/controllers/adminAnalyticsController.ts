import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

type ApiRequestLogDelegate = {
  count: (args: {
    where: {
      createdAt: { gte: Date; lt?: Date };
      statusCode?: number;
      campaignId?: { not: null };
    };
  }) => Promise<number>;
  groupBy: (args: {
    by: ['campaignId'];
    where: { createdAt: { gte: Date }; campaignId: { not: null } };
    _count: { id: true };
    orderBy: { _count: { id: 'desc' } };
    take: number;
  }) => Promise<Array<{ campaignId: string | null; _count: { id: number } }>>;
};

// Some local environments can have a stale generated Prisma client type cache.
// Resolve the delegate dynamically so analytics code compiles consistently.
const apiRequestLog = (prisma as unknown as { apiRequestLog: ApiRequestLogDelegate })
  .apiRequestLog;

export async function getTopApiUsage(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const grouped = await prisma.apiLog.groupBy({
    by: ['userId'],
    _count: { _all: true },
  });

  const top = grouped
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 10);

  if (top.length === 0) {
    res.json({ leaders: [] });
    return;
  }

  const userIds = top.map((row) => row.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  const userById = new Map(users.map((u) => [u.id, u]));

  res.json({
    leaders: top.map((row) => {
      const profile = userById.get(row.userId);
      return {
        userId: row.userId,
        requestCount: row._count._all,
        email: profile?.email ?? 'unknown',
        displayName: profile?.displayName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
      };
    }),
  });
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export async function getAdminUsageAnalytics(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const now = new Date();
  const windowStart = addUtcDays(startOfUtcDay(now), -1);

  const [totalRequests, tooManyRequests, topSpikersRaw] = await Promise.all([
    apiRequestLog.count({
      where: { createdAt: { gte: windowStart } },
    }),
    apiRequestLog.count({
      where: { createdAt: { gte: windowStart }, statusCode: 429 },
    }),
    apiRequestLog.groupBy({
      by: ['campaignId'],
      where: { createdAt: { gte: windowStart }, campaignId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  // Hourly buckets (UTC) for the last 24 hours.
  const hourly: Array<{ ts: string; count: number }> = [];
  for (let i = 23; i >= 0; i--) {
    const bucketStart = new Date(now.getTime() - i * 60 * 60 * 1000);
    const utcStart = new Date(
      Date.UTC(
        bucketStart.getUTCFullYear(),
        bucketStart.getUTCMonth(),
        bucketStart.getUTCDate(),
        bucketStart.getUTCHours(),
        0,
        0,
        0,
      ),
    );
    const utcEnd = new Date(utcStart.getTime() + 60 * 60 * 1000);
    const count = await apiRequestLog.count({
      where: { createdAt: { gte: utcStart, lt: utcEnd } },
    });
    hourly.push({ ts: utcStart.toISOString(), count });
  }

  res.json({
    window: {
      start: windowStart.toISOString(),
      end: now.toISOString(),
      timezone: 'UTC',
    },
    totals: {
      totalRequests,
      tooManyRequests,
    },
    topSpikers: topSpikersRaw.map((row) => ({
      campaignId: row.campaignId as string,
      requestCount: row._count.id,
    })),
    trafficByHour: hourly,
  });
}
