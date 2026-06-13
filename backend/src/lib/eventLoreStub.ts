import type { Prisma } from '@prisma/client';
import { EVENT_LORE_AUTO_GENERATED_METADATA_KEY } from '../../../shared/eventConsequence.js';
import { buildEventLoreBlocks } from './pageTemplates.js';

export function eventLorePageIdForCalendarEvent(calendarEventId: string): string {
  return `event-${calendarEventId}`;
}

export type EnsureEventLoreStubPageInput = {
  campaignId: string;
  calendarEventId: string;
  title?: string;
  descriptionMarkdown?: string | null;
  extraMetadata?: Record<string, unknown>;
};

export async function ensureEventLoreStubPage(
  tx: Prisma.TransactionClient,
  input: EnsureEventLoreStubPageInput,
): Promise<{ lorePageId: string; created: boolean }> {
  const lorePageId = eventLorePageIdForCalendarEvent(input.calendarEventId);
  const existing = await tx.wikiPage.findFirst({
    where: { id: lorePageId, campaignId: input.campaignId, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { lorePageId, created: false };
  }

  const title = input.title?.trim() || 'World event';
  const stubMarkdown =
    input.descriptionMarkdown?.trim() ||
    `# Event: ${title}\n\nDraft event page — add description and consequences when ready.`;
  const blocks = buildEventLoreBlocks(stubMarkdown);
  const metadata = {
    [EVENT_LORE_AUTO_GENERATED_METADATA_KEY]: true,
    ...(input.extraMetadata ?? {}),
  };

  await tx.wikiPage.create({
    data: {
      id: lorePageId,
      campaignId: input.campaignId,
      title,
      visibility: 'GM_ONLY',
      blocks: blocks as never,
      metadata: metadata as never,
    },
  });

  return { lorePageId, created: true };
}
