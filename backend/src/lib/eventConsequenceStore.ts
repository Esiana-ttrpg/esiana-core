import { randomUUID } from 'node:crypto';
import type { Prisma } from './prismaClient.js';
import {
  dedupeEventConsequencesById,
  mergeEventConsequenceSetIntoMetadata,
  readEventConsequencesFromMetadata,
  type EventConsequence,
} from '../../../shared/eventConsequence.js';
import { eventLorePageIdForCalendarEvent } from './eventLoreStub.js';

export { eventLorePageIdForCalendarEvent };

export async function loadEventConsequencesForCalendarEvent(
  tx: Prisma.TransactionClient | typeof import('./prisma.js').prisma,
  campaignId: string,
  calendarEventId: string,
  authorizedPageIds?: ReadonlySet<string>,
): Promise<{ lorePageId: string | null; consequences: EventConsequence[]; metadata: Record<string, unknown> | null }> {
  const event = await tx.calendarEvent.findFirst({ where: { id: calendarEventId, calendar: { campaignId } }, select: { metadata: true, wikiPageId: true } });
  const lorePageId = event?.wikiPageId ?? eventLorePageIdForCalendarEvent(calendarEventId);
  const page = authorizedPageIds && !authorizedPageIds.has(lorePageId) ? null : await tx.wikiPage.findFirst({
    where: { id: lorePageId, campaignId, deletedAt: null },
    select: { metadata: true },
  });
  const eventMetadata = event?.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : null;
  if (Object.prototype.hasOwnProperty.call(eventMetadata ?? {}, 'eventConsequences') || !page?.metadata || typeof page.metadata !== 'object' || Array.isArray(page.metadata) || !('eventConsequences' in page.metadata)) {
    const metadata = event?.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : null;
    return { lorePageId: authorizedPageIds && !authorizedPageIds.has(lorePageId) ? null : lorePageId, consequences: readEventConsequencesFromMetadata(metadata), metadata };
  }
  const metadata = { ...(page.metadata as Record<string, unknown>) };
  return {
    lorePageId,
    consequences: readEventConsequencesFromMetadata(metadata),
    metadata,
  };
}

export async function saveEventConsequences(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    calendarEventId: string;
    consequences: EventConsequence[];
    actorUserId: string;
    calendarEventTitle?: string;
  },
): Promise<EventConsequence[]> {
  await tx.campaign.update({ where: { id: input.campaignId }, data: { updatedAt: new Date() } });
  const deduped = dedupeEventConsequencesById(input.consequences);
  const event = await tx.calendarEvent.findFirstOrThrow({ where: { id: input.calendarEventId, calendar: { campaignId: input.campaignId } } });
  // Event metadata is authoritative. Page permissions and old authored copies cannot
  // change operational state, and saving consequences must not mutate a wiki document.
  const metadata = event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : {};
  await tx.calendarEvent.update({ where: { id: event.id }, data: { metadata: mergeEventConsequenceSetIntoMetadata(metadata, deduped) as Prisma.InputJsonValue } });

  return deduped;
}

export async function listActionableEventConsequencesForCampaign(
  campaignId: string,
  db: Prisma.TransactionClient | typeof import('./prisma.js').prisma,
): Promise<
  Array<{
    calendarEventId: string;
    lorePageId: string;
    eventTitle: string | null;
    consequences: EventConsequence[];
  }>
> {
  const events = await db.calendarEvent.findMany({ where: { calendar: { campaignId } }, select: { id: true, title: true, wikiPageId: true, metadata: true } });
  const pageIds = events.map(event => event.wikiPageId ?? eventLorePageIdForCalendarEvent(event.id));
  const pages = await db.wikiPage.findMany({ where: { campaignId, deletedAt: null, id: { in: pageIds } }, select: { id: true, metadata: true } });
  const byId = new Map(pages.map(page => [page.id, page]));
  const results: Array<{ calendarEventId: string; lorePageId: string; eventTitle: string | null; consequences: EventConsequence[] }> = [];
  for (const event of events) {
    const lorePageId = event.wikiPageId ?? eventLorePageIdForCalendarEvent(event.id);
    const pageMetadata = byId.get(lorePageId)?.metadata;
    const hasEventConsequences = event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata) && Object.prototype.hasOwnProperty.call(event.metadata, 'eventConsequences');
    const metadata = hasEventConsequences ? event.metadata : pageMetadata && typeof pageMetadata === 'object' && !Array.isArray(pageMetadata) && 'eventConsequences' in pageMetadata ? pageMetadata : event.metadata;
    const consequences = readEventConsequencesFromMetadata(metadata);
    if (consequences.length) results.push({ calendarEventId: event.id, lorePageId, eventTitle: event.title, consequences });
  }
  return results;
}

export function newApplicationRunId(): string {
  return randomUUID();
}
