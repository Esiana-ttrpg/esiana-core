import type { DowntimeFeedCard } from './downtimeHub.js';
import {
  buildQuestTimeFeedItems as buildItemsFromSignals,
  type QuestTimeFeedItem,
} from './questTimeSimulation.js';

export type { QuestTimeFeedItem };

export function buildQuestTimeFeedItems(input: Parameters<typeof buildItemsFromSignals>[0]): QuestTimeFeedItem[] {
  return buildItemsFromSignals(input);
}

export function adaptQuestTimeFeedItemsToDowntimeCards(
  items: QuestTimeFeedItem[],
  hrefByQuestId: ReadonlyMap<string, string>,
): DowntimeFeedCard[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    dateLabel: 'Quest pressure',
    tone: item.tone,
    href: hrefByQuestId.get(item.questPageId),
    sourceType: 'quest_time' as const,
    priority: item.priority,
    narrative: item.summary,
  }));
}
