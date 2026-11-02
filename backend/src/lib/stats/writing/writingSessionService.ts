import type { Prisma } from '../../prismaClient.js';
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

async function persistSession(
  tx: Tx | typeof prisma,
  sessionId: string,
  input: {
    lastActivityAt?: Date;
    intervals: WritingSessionInterval[];
    documentIds: string[];
    activeDurationMs: number;
  },
): Promise<void> {
  await tx.writingSession.update({
    where: { id: sessionId },
    data: {
      ...(input.lastActivityAt ? { lastActivityAt: input.lastActivityAt } : {}),
      intervals: asJson(input.intervals),
      documentIds: asJson(input.documentIds),
      activeDurationMs: input.activeDurationMs,
    },
  });
}

export async function closeWritingSession(
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
  await tx.writingSession.update({
    where: { id: session.id },
    data: {
      status: 'closed',
      endedAt: session.lastActivityAt,
    },
  });

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

  const existing = await loadOpenSession(tx, input.userId, input.campaignId);
  if (existing && isWritingSessionExpired(existing.lastActivityAt, now)) {
    await closeWritingSession(tx, existing);
  }

  let session =
    existing && !isWritingSessionExpired(existing.lastActivityAt, now) ? existing : null;

  if (!session) {
    if (kind === 'interval-end') return { sessionId: null };
    session = await tx.writingSession.create({
      data: {
        userId: input.userId,
        campaignId: input.campaignId,
        startedAt: now,
        lastActivityAt: now,
        completeness: 'measured',
        status: 'open',
        intervals: asJson([]),
        documentIds: asJson(uniqueDocumentIds([], input.documentId)),
      },
    });
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
  await persistSession(tx, session.id, {
    lastActivityAt: kind === 'interval-end' ? undefined : now,
    intervals: computed.intervals,
    documentIds,
    activeDurationMs: computed.activeDurationMs,
  });
  return { sessionId: session.id };
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
      lastActivityAt: now,
      activeDurationMs: durationMs,
      status: 'open',
      completeness: 'partial',
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
  await closeWritingSession(tx, {
    id: session.id,
    campaignId: input.campaignId,
    userId: input.userId,
    lastActivityAt: now,
    activeDurationMs: durationMs,
    documentIds: session.documentIds,
    completeness: 'partial',
  });
}
