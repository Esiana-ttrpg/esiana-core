import { Prisma } from '../../prismaClient.js';
import { prisma } from '../../prisma.js';
import { logCampaignActivity } from '../../campaignActivity.js';
import { incrementDailyRollup } from '../userWritingDailyRollup.js';
import { writingSessionRollupFields } from './aggregateWritingWords.js';
import {
  applyActivityInterval,
  closeInstanceIntervals,
  isWritingSessionExpired,
  parseWritingSessionIntervals,
  unionIntervalDurationMs,
  uniqueDocumentIds,
  type WritingSessionInterval,
} from '../../../../../shared/writingSession.js';

type Tx = Prisma.TransactionClient;

const TOUCH_RETRY_LIMIT = 8;

function openLockFor(userId: string, campaignId: string): string {
  return `${userId}:${campaignId}`;
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export type WritingHeartbeatKind = 'activity' | 'interval-end' | 'contribution';

export type WritingHeartbeatInput = {
  userId: string;
  campaignId: string;
  now?: Date;
  clientInstanceKey?: string | null;
  documentId?: string | null;
  documentTitle?: string | null;
  kind: WritingHeartbeatKind;
  focused?: boolean;
  visible?: boolean;
  connected?: boolean;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function recompute(intervals: WritingSessionInterval[]): {
  intervals: WritingSessionInterval[];
  activeDurationMs: number;
} {
  return {
    intervals,
    activeDurationMs: unionIntervalDurationMs(intervals),
  };
}

async function persistSessionVersioned(
  tx: Tx | typeof prisma,
  session: { id: string; intervalVersion: number },
  input: {
    lastActivityAt?: Date;
    intervals: WritingSessionInterval[];
    documentIds: string[];
    activeDurationMs: number;
  },
): Promise<boolean> {
  const result = await tx.writingSession.updateMany({
    where: {
      id: session.id,
      status: 'open',
      intervalVersion: session.intervalVersion,
    },
    data: {
      ...(input.lastActivityAt ? { lastActivityAt: input.lastActivityAt } : {}),
      intervals: asJson(input.intervals),
      documentIds: asJson(input.documentIds),
      activeDurationMs: input.activeDurationMs,
      intervalVersion: { increment: 1 },
    },
  });
  return result.count === 1;
}

async function recordClosedSessionMetrics(
  tx: Tx | typeof prisma,
  session: {
    id: string;
    campaignId: string;
    userId: string;
    lastActivityAt: Date;
    activeDurationMs: number;
    documentIds: unknown;
    completeness: string;
  },
): Promise<void> {
  if (session.activeDurationMs < 1000) return;

  const documentIds = uniqueDocumentIds(session.documentIds);
  const entityId = documentIds[0] ?? session.id;
  logCampaignActivity({
    campaignId: session.campaignId,
    userId: session.userId,
    actionType: 'UPDATE',
    entityType: 'WRITING_SESSION',
    entityId,
    entityName: 'Writing session',
    parentContext: JSON.stringify({
      durationMs: session.activeDurationMs,
      writingSessionId: session.id,
      completeness: session.completeness,
    }),
  });

  await incrementDailyRollup(tx, {
    userId: session.userId,
    at: session.lastActivityAt,
    ...writingSessionRollupFields({
      durationMs: session.activeDurationMs,
      linksAdded: 0,
      at: session.lastActivityAt,
    }),
  });
}

export async function closeWritingSession(
  tx: Tx | typeof prisma,
  session: {
    id: string;
    lastActivityAt: Date;
  },
): Promise<boolean> {
  const closed = await tx.writingSession.updateMany({
    where: { id: session.id, status: 'open' },
    data: {
      status: 'closed',
      endedAt: session.lastActivityAt,
      openLock: null,
    },
  });
  if (closed.count !== 1) return false;

  const stored = await tx.writingSession.findUnique({
    where: { id: session.id },
  });
  if (stored) await recordClosedSessionMetrics(tx, stored);
  return true;
}

async function loadOpenSession(
  tx: Tx | typeof prisma,
  userId: string,
  campaignId: string,
) {
  return tx.writingSession.findFirst({
    where: { userId, campaignId, status: 'open' },
    orderBy: { lastActivityAt: 'desc' },
  });
}

export async function closeExpiredWritingSessions(
  tx: Tx | typeof prisma,
  input: { userId: string; campaignId: string; now: Date },
): Promise<void> {
  const open = await loadOpenSession(tx, input.userId, input.campaignId);
  if (!open) return;
  if (!isWritingSessionExpired(open.lastActivityAt, input.now)) return;
  await closeWritingSession(tx, open);
}

export async function touchWritingSession(
  tx: Tx | typeof prisma,
  input: WritingHeartbeatInput,
): Promise<{ sessionId: string | null }> {
  const now = input.now ?? new Date();
  let kind = input.kind;
  const focused = input.focused !== false;
  const visible = input.visible !== false;
  const connected = input.connected !== false;
  if (kind === 'activity' && (!focused || !visible || !connected)) {
    kind = 'interval-end';
  }

  for (let attempt = 0; attempt < TOUCH_RETRY_LIMIT; attempt += 1) {
    let session = await loadOpenSession(tx, input.userId, input.campaignId);
    if (session && isWritingSessionExpired(session.lastActivityAt, now)) {
      await closeWritingSession(tx, session);
      session = null;
    }

    if (!session) {
      if (kind === 'interval-end') return { sessionId: null };
      try {
        session = await tx.writingSession.create({
          data: {
            userId: input.userId,
            campaignId: input.campaignId,
            startedAt: now,
            lastActivityAt: now,
            completeness: 'measured',
            status: 'open',
            openLock: openLockFor(input.userId, input.campaignId),
            intervalVersion: 0,
            intervals: asJson([]),
            documentIds: asJson(uniqueDocumentIds([], input.documentId)),
          },
        });
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
        continue;
      }
    }

    let intervals = parseWritingSessionIntervals(session.intervals);
    if (kind === 'activity' && input.clientInstanceKey) {
      intervals = applyActivityInterval(intervals, {
        clientInstanceKey: input.clientInstanceKey,
        at: now,
      });
    } else if (kind === 'interval-end' && input.clientInstanceKey) {
      intervals = closeInstanceIntervals(intervals, input.clientInstanceKey);
    }

    const computed = recompute(intervals);
    const documentIds = uniqueDocumentIds(session.documentIds, input.documentId);
    const written = await persistSessionVersioned(tx, session, {
      lastActivityAt: kind === 'interval-end' ? undefined : now,
      intervals: computed.intervals,
      documentIds,
      activeDurationMs: computed.activeDurationMs,
    });
    if (written) return { sessionId: session.id };
  }

  const fallback = await loadOpenSession(tx, input.userId, input.campaignId);
  return { sessionId: fallback?.id ?? null };
}

export async function ingestLegacyWritingSession(
  tx: Tx | typeof prisma,
  input: {
    userId: string;
    campaignId: string;
    documentId: string;
    durationMs: number;
    now?: Date;
  },
): Promise<void> {
  const now = input.now ?? new Date();
  const durationMs = Math.max(0, input.durationMs);
  const startedAt = new Date(now.getTime() - durationMs);
  await closeExpiredWritingSessions(tx, {
    userId: input.userId,
    campaignId: input.campaignId,
    now,
  });
  const session = await tx.writingSession.create({
    data: {
      userId: input.userId,
      campaignId: input.campaignId,
      startedAt,
      endedAt: now,
      lastActivityAt: now,
      activeDurationMs: durationMs,
      status: 'closed',
      completeness: 'partial',
      openLock: null,
      intervals: asJson([
        {
          clientInstanceKey: 'legacy',
          startedAt: startedAt.toISOString(),
          endedAt: now.toISOString(),
          open: false,
        },
      ]),
      documentIds: asJson(uniqueDocumentIds([], input.documentId)),
    },
  });
  await recordClosedSessionMetrics(tx, session);
}
