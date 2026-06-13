import type { Prisma } from '@prisma/client';
import {
  mergeQuestTimeState,
  parseQuestTimePayload,
  type QuestTimelineTouchReason,
  writeQuestTimeToMetadata,
} from '../../../shared/questTimeSimulation.js';

export type TouchQuestTimelineInput = {
  campaignId: string;
  questPageId: string;
  epochMinute: bigint | string;
  reason: QuestTimelineTouchReason;
  actorUserId?: string | null;
};

/**
 * Canonical party-touch update — do not mutate partyTouchEpochMinute elsewhere.
 */
export async function touchQuestTimeline(
  tx: Prisma.TransactionClient,
  input: TouchQuestTimelineInput,
): Promise<boolean> {
  const page = await tx.wikiPage.findFirst({
    where: { id: input.questPageId, campaignId: input.campaignId, deletedAt: null },
    select: { metadata: true },
  });
  if (!page) return false;

  const payload = parseQuestTimePayload(page.metadata);
  if (!payload) return false;

  const epochStr =
    typeof input.epochMinute === 'bigint'
      ? input.epochMinute.toString()
      : input.epochMinute;

  const updated = mergeQuestTimeState(payload, {
    partyTouchEpochMinute: epochStr,
  });

  const base =
    page.metadata && typeof page.metadata === 'object'
      ? { ...(page.metadata as Record<string, unknown>) }
      : {};

  await tx.wikiPage.update({
    where: { id: input.questPageId },
    data: {
      metadata: writeQuestTimeToMetadata(base, updated) as never,
    },
  });

  return true;
}

export async function touchQuestTimelinesForIds(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    questPageIds: Iterable<string>;
    epochMinute: bigint | string;
    reason: QuestTimelineTouchReason;
    actorUserId?: string | null;
  },
): Promise<number> {
  let touched = 0;
  const unique = [...new Set(input.questPageIds)];
  for (const questPageId of unique) {
    const ok = await touchQuestTimeline(tx, {
      campaignId: input.campaignId,
      questPageId,
      epochMinute: input.epochMinute,
      reason: input.reason,
      actorUserId: input.actorUserId,
    });
    if (ok) touched += 1;
  }
  return touched;
}
