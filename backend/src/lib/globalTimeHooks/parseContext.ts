import {
  computeAdvanceMagnitude,
  type GlobalTimeAdvanceContext,
  type GlobalTimeAdvanceSource,
} from '../../../../shared/globalTimeHooks.js';

export function buildGlobalTimeAdvanceContext(input: {
  campaignId: string;
  previousEpochMinute: bigint;
  nextEpochMinute: bigint;
  advancedBy: { amount: number; unit: string };
  source: GlobalTimeAdvanceSource;
  actorUserId?: string;
  batchId?: string;
}): GlobalTimeAdvanceContext {
  const elapsedMinutes = input.nextEpochMinute - input.previousEpochMinute;
  return {
    campaignId: input.campaignId,
    previousEpochMinute: input.previousEpochMinute.toString(),
    nextEpochMinute: input.nextEpochMinute.toString(),
    elapsedMinutes: elapsedMinutes.toString(),
    advancedBy: {
      amount: String(input.advancedBy.amount),
      unit: input.advancedBy.unit,
    },
    advanceMagnitude: computeAdvanceMagnitude(elapsedMinutes),
    source: input.source,
    ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
    ...(input.batchId ? { batchId: input.batchId } : {}),
  };
}
