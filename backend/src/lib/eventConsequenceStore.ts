import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  dedupeEventConsequencesById,
  EVENT_LORE_AUTO_GENERATED_METADATA_KEY,
  mergeEventConsequenceSetIntoMetadata,
  readEventConsequencesFromMetadata,
  type EventConsequence,
} from '../../../shared/eventConsequence.js';
import { parseBaseEventIdFromLorePageId } from './eventLoreWiki.js';
import { ensureEventLoreStubPage, eventLorePageIdForCalendarEvent } from './eventLoreStub.js';

export { eventLorePageIdForCalendarEvent };

export async function loadEventConsequencesForCalendarEvent(
  tx: Prisma.TransactionClient | typeof import('./prisma.js').prisma,
  campaignId: string,
  calendarEventId: string,
): Promise<{ lorePageId: string; consequences: EventConsequence[]; metadata: Record<string, unknown> | null }> {
  const lorePageId = eventLorePageIdForCalendarEvent(calendarEventId);
  const page = await tx.wikiPage.findFirst({
    where: { id: lorePageId, campaignId, deletedAt: null },
    select: { metadata: true },
  });
  if (!page?.metadata || typeof page.metadata !== 'object' || Array.isArray(page.metadata)) {
    return { lorePageId, consequences: [], metadata: null };
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
  const deduped = dedupeEventConsequencesById(input.consequences);
  const lorePageId = eventLorePageIdForCalendarEvent(input.calendarEventId);

  let page = await tx.wikiPage.findFirst({
    where: { id: lorePageId, campaignId: input.campaignId, deletedAt: null },
    select: { id: true, metadata: true },
  });

  if (!page) {
    const title = input.calendarEventTitle?.trim() || 'World event';
    const stubMarkdown = `# Event: ${title}\n\nAuto-generated event lore page.`;
    const stubMetadata = mergeEventConsequenceSetIntoMetadata(
      { [EVENT_LORE_AUTO_GENERATED_METADATA_KEY]: true },
      deduped,
    );
    await ensureEventLoreStubPage(tx, {
      campaignId: input.campaignId,
      calendarEventId: input.calendarEventId,
      title,
      descriptionMarkdown: stubMarkdown,
      extraMetadata: stubMetadata,
    });
    return deduped;
  }

  const metadata =
    page.metadata && typeof page.metadata === 'object' && !Array.isArray(page.metadata)
      ? { ...(page.metadata as Record<string, unknown>) }
      : {};

  await tx.wikiPage.update({
    where: { id: page.id },
    data: {
      metadata: mergeEventConsequenceSetIntoMetadata(metadata, deduped) as never,
    },
  });

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
  const pages = await db.wikiPage.findMany({
    where: {
      campaignId,
      deletedAt: null,
      id: { startsWith: 'event-' },
    },
    select: { id: true, metadata: true },
  });

  const results: Array<{
    calendarEventId: string;
    lorePageId: string;
    eventTitle: string | null;
    consequences: EventConsequence[];
  }> = [];

  for (const page of pages) {
    const calendarEventId = parseBaseEventIdFromLorePageId(page.id);
    if (!calendarEventId) continue;
    const consequences = readEventConsequencesFromMetadata(page.metadata);
    if (consequences.length === 0) continue;
    const event = await db.calendarEvent.findFirst({
      where: { id: calendarEventId, calendar: { campaignId } },
      select: { title: true },
    });
    results.push({
      calendarEventId,
      lorePageId: page.id,
      eventTitle: event?.title ?? null,
      consequences,
    });
  }

  return results;
}

export function newApplicationRunId(): string {
  return randomUUID();
}
