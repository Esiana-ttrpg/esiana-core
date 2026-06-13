import {
  collectConsequencePageIds,
  formatConsequenceFeedSummary,
} from '../../../shared/eventConsequencePresentation.js';
import {
  isEventConsequenceActionable,
  type EventConsequence,
} from '../../../shared/eventConsequence.js';
import type { DowntimeFeedCard } from '../../../shared/downtimeHub.js';
import { listActionableEventConsequencesForCampaign } from './eventConsequenceStore.js';
import { resolveWikiPageTitles } from './downtimeHavenService.js';
import { prisma } from './prisma.js';

function consequenceTone(row: EventConsequence): DowntimeFeedCard['tone'] {
  const state = row.application?.state ?? 'pending';
  if (state === 'blocked' || state === 'partial') return 'escalation';
  if (state === 'pending') return 'warning';
  return 'neutral';
}

export function buildEventConsequenceFeedCards(input: {
  campaignHandle: string;
  events: Array<{
    calendarEventId: string;
    eventTitle: string | null;
    consequences: EventConsequence[];
  }>;
  pageTitles?: Map<string, string>;
  limit?: number;
}): DowntimeFeedCard[] {
  const titles = input.pageTitles ?? new Map<string, string>();
  const cards: DowntimeFeedCard[] = [];
  for (const event of input.events) {
    for (const row of event.consequences) {
      if (!isEventConsequenceActionable(row)) continue;
      cards.push({
        id: `event-consequence:${event.calendarEventId}:${row.id}`,
        title: event.eventTitle?.trim() || 'World event',
        summary: formatConsequenceFeedSummary(row, titles),
        dateLabel: 'Not yet applied',
        tone: consequenceTone(row),
        href: `/campaigns/${input.campaignHandle}/event-${event.calendarEventId}`,
        sourceType: 'event_consequence',
        priority: 'actionable',
      });
    }
  }
  const limit = input.limit ?? 8;
  return cards.slice(0, limit);
}

export async function loadEventConsequencePresentation(
  campaignId: string,
  campaignHandle: string,
): Promise<{
  cards: DowntimeFeedCard[];
  pendingActionableCount: number;
}> {
  const events = await listActionableEventConsequencesForCampaign(campaignId, prisma);
  const pageIds = [
    ...new Set(
      events.flatMap((event) =>
        event.consequences.flatMap((row) => collectConsequencePageIds(row)),
      ),
    ),
  ];
  const pageTitles = await resolveWikiPageTitles(campaignId, pageIds);
  const cards = buildEventConsequenceFeedCards({ campaignHandle, events, pageTitles });
  const pendingActionableCount = events.reduce((sum, event) => {
    return (
      sum +
      event.consequences.filter((row) => {
        const state = row.application?.state ?? 'pending';
        return state === 'pending' || state === 'partial';
      }).length
    );
  }, 0);
  return { cards, pendingActionableCount };
}

export function countPendingEventConsequencesFromEvents(
  events: Array<{ consequences: EventConsequence[] }>,
): number {
  return events.reduce((sum, event) => {
    return (
      sum +
      event.consequences.filter((row) => {
        const state = row.application?.state ?? 'pending';
        return state === 'pending' || state === 'partial';
      }).length
    );
  }, 0);
}
