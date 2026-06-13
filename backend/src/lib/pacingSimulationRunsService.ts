import type {
  AdvanceMagnitude,
  GlobalTimeHookId,
  GlobalTimeHookResult,
  GlobalTimeHookStatus,
  GlobalTimeSimulationReceipt,
} from '../../../shared/globalTimeHooks.js';
import { prisma } from './prisma.js';

const NEARBY_SNAPSHOT_WINDOW_MINUTES = 1440n;

export type PacingHookSummary = {
  hookId: GlobalTimeHookId;
  status: GlobalTimeHookStatus;
  summary: string | null;
};

export type PacingSimulationRunSummary = {
  id: string;
  source: string;
  sourceRef: string | null;
  previousEpochMinute: string;
  nextEpochMinute: string;
  createdAt: string;
  advanceMagnitude: AdvanceMagnitude | null;
  elapsedMinutes: string | null;
  hookSummaries: PacingHookSummary[];
  worldAdvanceChronologyEventId: string | null;
  nearbySnapshotCount: number;
};

function parseReceipt(raw: unknown): GlobalTimeSimulationReceipt | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as GlobalTimeSimulationReceipt;
}

function hookSummariesFromReceipt(receipt: GlobalTimeSimulationReceipt | null): PacingHookSummary[] {
  if (!receipt?.results?.length) return [];
  return receipt.results.map((row: GlobalTimeHookResult) => ({
    hookId: row.hookId,
    status: row.status,
    summary: row.summary ?? null,
  }));
}

export async function listPacingSimulationRuns(
  campaignId: string,
  options?: { limit?: number },
): Promise<PacingSimulationRunSummary[]> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);

  const rows = await prisma.timeAdvanceSimulationRun.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      source: true,
      sourceRef: true,
      previousEpochMinute: true,
      nextEpochMinute: true,
      createdAt: true,
      receipt: true,
    },
  });

  const worldAdvanceBatchIds = rows
    .filter((row) => row.source === 'world_advance' && row.sourceRef)
    .map((row) => row.sourceRef as string);

  const receiptByBatchId = new Map<string, string>();
  if (worldAdvanceBatchIds.length > 0) {
    const receipts = await prisma.worldAdvanceReceipt.findMany({
      where: {
        campaignId,
        batchId: { in: worldAdvanceBatchIds },
      },
      select: { batchId: true, chronologyEventId: true },
      distinct: ['batchId'],
    });
    for (const receipt of receipts) {
      receiptByBatchId.set(receipt.batchId, receipt.chronologyEventId);
    }
  }

  const summaries: PacingSimulationRunSummary[] = [];

  for (const row of rows) {
    const receipt = parseReceipt(row.receipt);
    const nextMinute = row.nextEpochMinute;
    const windowStart = nextMinute - NEARBY_SNAPSHOT_WINDOW_MINUTES;
    const windowEnd = nextMinute + NEARBY_SNAPSHOT_WINDOW_MINUTES;

    const nearbySnapshotCount = await prisma.narrativeStateSnapshot.count({
      where: {
        campaignId,
        capturedAtEpochMinute: { gte: windowStart, lte: windowEnd },
      },
    });

    summaries.push({
      id: row.id,
      source: row.source,
      sourceRef: row.sourceRef,
      previousEpochMinute: row.previousEpochMinute.toString(),
      nextEpochMinute: row.nextEpochMinute.toString(),
      createdAt: row.createdAt.toISOString(),
      advanceMagnitude: receipt?.context.advanceMagnitude ?? null,
      elapsedMinutes: receipt?.context.elapsedMinutes ?? null,
      hookSummaries: hookSummariesFromReceipt(receipt),
      worldAdvanceChronologyEventId:
        row.source === 'world_advance' && row.sourceRef
          ? receiptByBatchId.get(row.sourceRef) ?? null
          : null,
      nearbySnapshotCount,
    });
  }

  return summaries;
}
