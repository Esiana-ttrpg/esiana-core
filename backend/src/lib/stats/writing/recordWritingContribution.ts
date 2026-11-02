import type { Prisma } from '../../prismaClient.js';
import { prisma } from '../../prisma.js';
import { extractProseForSource } from './sourceRegistry.js';
import { diffWords, type WordDiff } from './wordDiff.js';

type Tx = Prisma.TransactionClient;

export type WritingOrigin = 'human' | 'integration' | 'automation' | 'import' | 'system';
export type WritingAvailability = 'measured' | 'reconstructed' | 'incomplete';

export type WritingChange = WordDiff & {
  availability: WritingAvailability;
};

const SKIPPED_PROVENANCES = new Set([
  'import',
  'restore',
  'seed',
  'migration',
  'repair',
]);

export function shouldRecordWritingContribution(input: {
  emitEvents?: boolean;
  actorUserId?: string | null;
  narrativeSource?: string;
  skipWritingContribution?: boolean;
}): boolean {
  if (input.skipWritingContribution === true) return false;
  if (input.emitEvents === false) return false;
  if (!input.actorUserId) return false;
  const source = input.narrativeSource ?? 'user';
  return source === 'user' && !SKIPPED_PROVENANCES.has(source);
}

export function originFromProvenance(narrativeSource?: string): WritingOrigin {
  const source = narrativeSource ?? 'user';
  if (source === 'user') return 'human';
  if (source === 'import') return 'import';
  return 'system';
}

/** Net-only reconstruction. Never invents a two-sided added/removed split. */
export function reconstructedWordChange(net: number): WritingChange {
  const netChange = Number.isFinite(net) ? Math.trunc(net) : 0;
  return {
    wordsAdded: Math.max(0, netChange),
    wordsRemoved: Math.abs(Math.min(0, netChange)),
    netChange,
    availability: 'reconstructed',
  };
}

export function incompleteWordChange(net: number): WritingChange {
  return {
    ...reconstructedWordChange(net),
    availability: 'incomplete',
  };
}

export function measureWritingChange(input: {
  sourceId: string;
  previousBlocks: unknown;
  nextBlocks: unknown;
}): WritingChange {
  const previous = extractProseForSource(input.sourceId, input.previousBlocks);
  const next = extractProseForSource(input.sourceId, input.nextBlocks);
  return {
    ...diffWords(previous, next),
    availability: 'measured',
  };
}

export async function recordWritingContribution(
  tx: Tx | typeof prisma,
  input: {
    userId: string;
    campaignId: string;
    sourceId: string;
    documentId: string;
    occurredAt: Date;
    change: WritingChange;
    narrativeEventId?: string | null;
    origin?: WritingOrigin;
    writingSessionId?: string | null;
  },
): Promise<void> {
  const origin = input.origin ?? 'human';
  if (origin !== 'human') return;
  const narrativeEventId = input.narrativeEventId ?? null;

  if (narrativeEventId) {
    const existing = await tx.writingContribution.findUnique({
      where: { narrativeEventId },
      select: { id: true },
    });
    if (existing) return;
  }

  await tx.writingContribution.create({
    data: {
      userId: input.userId,
      campaignId: input.campaignId,
      sourceId: input.sourceId,
      documentId: input.documentId,
      occurredAt: input.occurredAt,
      wordsAdded: input.change.wordsAdded,
      wordsRemoved: input.change.wordsRemoved,
      netChange: input.change.netChange,
      narrativeEventId,
      origin,
      availability: input.change.availability,
      writingSessionId: input.writingSessionId ?? null,
    },
  });
}
