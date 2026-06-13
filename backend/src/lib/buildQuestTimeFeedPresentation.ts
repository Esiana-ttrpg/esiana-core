import type { DowntimeFeedCard } from '../../../shared/downtimeHub.js';
import {
  adaptQuestTimeFeedItemsToDowntimeCards,
  buildQuestTimeFeedItems,
  type QuestTimeFeedItem,
} from '../../../shared/questTimeFeedPresentation.js';
import type { QuestTimeSignal } from '../../../shared/questTimeSimulation.js';
import { emptyQuestTimePayload, parseQuestTimePayload } from '../../../shared/questTimeSimulation.js';
import { prisma } from './prisma.js';
import { loadPendingQuestTimeFeedSignals } from './questTimeSimulationService.js';
import { buildWikiPageHref } from './wikiLinkService.js';

export type QuestTimeFeedPresentation = {
  items: QuestTimeFeedItem[];
  downtimeCards: DowntimeFeedCard[];
  pendingActionableCount: number;
};

export async function loadQuestTimeFeedPresentation(input: {
  campaignId: string;
  campaignHandle: string;
  currentEpochMinute: bigint;
  recentSignals?: QuestTimeSignal[];
}): Promise<QuestTimeFeedPresentation> {
  const pendingSignals = await loadPendingQuestTimeFeedSignals(
    prisma,
    input.campaignId,
    input.currentEpochMinute,
  );
  const allSignals = [...(input.recentSignals ?? []), ...pendingSignals];

  const questIds = [...new Set(allSignals.map((s) => s.questPageId))];
  const pages =
    questIds.length > 0
      ? await prisma.wikiPage.findMany({
          where: { campaignId: input.campaignId, id: { in: questIds } },
          select: { id: true, title: true, workspace: true, pathKey: true, metadata: true },
        })
      : [];

  const rowsById = new Map(
    pages.map((page) => [
      page.id,
      {
        questTitle: page.title,
        questTime: parseQuestTimePayload(page.metadata) ?? emptyQuestTimePayload(),
      },
    ]),
  );

  const dismissedKeys = new Set(
    (
      await prisma.narrativeConsequenceReceipt.findMany({
        where: {
          campaignId: input.campaignId,
          idempotencyKey: { startsWith: 'quest-expiry-dismissed:' },
        },
        select: { idempotencyKey: true },
      })
    ).map((row) => row.idempotencyKey),
  );

  const items = buildQuestTimeFeedItems({
    signals: allSignals,
    rowsById,
    dismissedExpiryKeys: dismissedKeys,
  });

  const hrefByQuestId = new Map(
    pages.map((page) => [page.id, buildWikiPageHref(input.campaignHandle, page)]),
  );

  const downtimeCards = adaptQuestTimeFeedItemsToDowntimeCards(items, hrefByQuestId);
  const pendingActionableCount = downtimeCards.filter(
    (card) => card.priority === 'actionable',
  ).length;

  return { items, downtimeCards, pendingActionableCount };
}

export { adaptQuestTimeFeedItemsToDowntimeCards, buildQuestTimeFeedItems };
