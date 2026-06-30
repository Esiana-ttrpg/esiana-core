import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

type Tx = Prisma.TransactionClient;

export type DailyRollupIncrement = {
  userId: string;
  at: Date;
  wordsAdded?: number;
  wordsRemoved?: number;
  editsCount?: number;
  linksCreated?: number;
  sessionCount?: number;
  sessionMinutes?: number;
  sessionHourUtc?: number;
  substantialRevisions?: number;
};

/** UTC calendar date at midnight for bucketing. */
export function utcDateBucket(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/**
 * Additively upsert a user's daily writing rollup bucket.
 * Safe to call inside or outside a transaction (uses passed client).
 */
export async function incrementDailyRollup(
  tx: Tx | typeof prisma,
  input: DailyRollupIncrement,
): Promise<void> {
  const date = utcDateBucket(input.at);
  const wordsAdded = input.wordsAdded ?? 0;
  const wordsRemoved = input.wordsRemoved ?? 0;
  const editsCount = input.editsCount ?? 0;
  const linksCreated = input.linksCreated ?? 0;
  const sessionCount = input.sessionCount ?? 0;
  const sessionMinutes = input.sessionMinutes ?? 0;
  const substantialRevisions = input.substantialRevisions ?? 0;

  if (
    wordsAdded === 0 &&
    wordsRemoved === 0 &&
    editsCount === 0 &&
    linksCreated === 0 &&
    sessionCount === 0 &&
    sessionMinutes === 0 &&
    substantialRevisions === 0
  ) {
    return;
  }

  const existing = await tx.userWritingDailyRollup.findUnique({
    where: { userId_date: { userId: input.userId, date } },
    select: { peakHourUtc: true, sessionMinutes: true },
  });

  let peakHourUtc = existing?.peakHourUtc ?? null;
  if (
    input.sessionHourUtc != null &&
    sessionMinutes > 0 &&
    (existing == null ||
      sessionMinutes > (existing.sessionMinutes ?? 0) ||
      (sessionMinutes === (existing.sessionMinutes ?? 0) &&
        input.sessionHourUtc === existing.peakHourUtc))
  ) {
    const hourMinutes = new Map<number, number>();
    if (existing?.peakHourUtc != null) {
      hourMinutes.set(existing.peakHourUtc, existing.sessionMinutes ?? 0);
    }
    const prev = hourMinutes.get(input.sessionHourUtc) ?? 0;
    hourMinutes.set(input.sessionHourUtc, prev + sessionMinutes);
    let bestHour = input.sessionHourUtc;
    let bestMinutes = 0;
    for (const [hour, minutes] of hourMinutes) {
      if (minutes > bestMinutes) {
        bestMinutes = minutes;
        bestHour = hour;
      }
    }
    peakHourUtc = bestHour;
  }

  await tx.userWritingDailyRollup.upsert({
    where: { userId_date: { userId: input.userId, date } },
    create: {
      userId: input.userId,
      date,
      wordsAdded,
      wordsRemoved,
      editsCount,
      linksCreated,
      sessionCount,
      sessionMinutes,
      peakHourUtc,
      substantialRevisions,
    },
    update: {
      wordsAdded: { increment: wordsAdded },
      wordsRemoved: { increment: wordsRemoved },
      editsCount: { increment: editsCount },
      linksCreated: { increment: linksCreated },
      sessionCount: { increment: sessionCount },
      sessionMinutes: { increment: sessionMinutes },
      substantialRevisions: { increment: substantialRevisions },
      ...(peakHourUtc != null ? { peakHourUtc } : {}),
    },
  });
}
