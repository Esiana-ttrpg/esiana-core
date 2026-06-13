import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';

export const EVENT_LORE_DESCRIPTION_BLOCK_TITLE = 'Description';

const EVENT_LORE_PAGE_ID_PATTERN = /^event-[a-zA-Z0-9_-]+$/;

const EMPTY_HTML_WRAPPER_PATTERN =
  /<p>(?:\s|<br\s*\/?>)*<\/p>/gi;

export type WikiBlockLike = {
  id?: string;
  type?: string;
  title?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  content?: Record<string, unknown>;
  isPrivate?: boolean;
  visibility?: string;
};

export function isEventLorePageId(pageId: string): boolean {
  return EVENT_LORE_PAGE_ID_PATTERN.test(pageId);
}

export function parseBaseEventIdFromLorePageId(pageId: string): string | null {
  if (!isEventLorePageId(pageId)) return null;
  return pageId.slice('event-'.length);
}

function isMarkdownHeadingOnlyNoise(value: string): boolean {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return true;
  return lines.every((line) => /^#+\s*$/.test(line));
}

export function isEffectivelyEmptyDescription(value: string | null | undefined): boolean {
  if (value == null) return true;
  let normalized = value.replace(EMPTY_HTML_WRAPPER_PATTERN, '');
  normalized = normalized.replace(/<[^>]+>/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return true;
  const withoutHeadingMarkers = normalized
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutHeadingMarkers.length === 0) return true;
  return isMarkdownHeadingOnlyNoise(normalized);
}

export function normalizeDescriptionMarkdown(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (isEffectivelyEmptyDescription(trimmed)) return null;
  return trimmed;
}

export function findPrimaryDescriptionBlockIndex(blocks: WikiBlockLike[]): number {
  let bestIndex = -1;
  let bestRank = Number.POSITIVE_INFINITY;

  blocks.forEach((block, index) => {
    if (block.type !== 'text-tiptap') return;
    const y = typeof block.y === 'number' && Number.isFinite(block.y) ? block.y : 0;
    const x = typeof block.x === 'number' && Number.isFinite(block.x) ? block.x : 0;
    const rank = y * 1000 + x;
    if (rank < bestRank) {
      bestRank = rank;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function findPrimaryDescriptionBlock(
  blocks: WikiBlockLike[],
): WikiBlockLike | null {
  const index = findPrimaryDescriptionBlockIndex(blocks);
  return index >= 0 ? (blocks[index] ?? null) : null;
}

export function extractDescriptionMarkdown(blocks: unknown): string | null {
  if (!Array.isArray(blocks)) return null;
  const rows = blocks as WikiBlockLike[];
  const primary = findPrimaryDescriptionBlock(rows);
  if (!primary?.content || typeof primary.content !== 'object') return null;
  const markdown = primary.content.markdown;
  if (typeof markdown !== 'string') return null;
  return normalizeDescriptionMarkdown(markdown);
}

export function hydrateEventLoreBlocks(
  blocks: unknown,
  descriptionMarkdown: string | null,
): WikiBlockLike[] {
  const normalized = descriptionMarkdown ?? '';
  const source = Array.isArray(blocks) ? (blocks as WikiBlockLike[]) : [];
  const next = source.map((block) => ({
    ...block,
    content:
      block.content && typeof block.content === 'object'
        ? { ...block.content }
        : {},
  }));

  const primaryIndex = findPrimaryDescriptionBlockIndex(next);
  if (primaryIndex >= 0) {
    const primary = next[primaryIndex]!;
    next[primaryIndex] = {
      ...primary,
      title: EVENT_LORE_DESCRIPTION_BLOCK_TITLE,
      content: {
        ...(primary.content ?? {}),
        markdown: normalized,
      },
    };
    return next;
  }

  next.unshift({
    id: randomUUID(),
    type: 'text-tiptap',
    title: EVENT_LORE_DESCRIPTION_BLOCK_TITLE,
    x: 0,
    y: 0,
    w: 2,
    h: 2,
    content: { markdown: normalized },
    isPrivate: false,
    visibility: 'Party',
  });

  return next;
}

export async function loadCalendarEventDescriptionForLorePage(
  campaignId: string,
  pageId: string,
): Promise<string | null> {
  const baseEventId = parseBaseEventIdFromLorePageId(pageId);
  if (!baseEventId) return null;

  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: baseEventId,
      calendar: { campaignId },
    },
    select: { description: true },
  });

  return event?.description ?? null;
}

export async function syncEventLoreDescriptionFromBlocks(
  campaignId: string,
  pageId: string,
  blocks: unknown,
): Promise<string | null> {
  const baseEventId = parseBaseEventIdFromLorePageId(pageId);
  if (!baseEventId) return null;

  const description = extractDescriptionMarkdown(blocks);
  await prisma.calendarEvent.updateMany({
    where: {
      id: baseEventId,
      calendar: { campaignId },
    },
    data: { description },
  });

  return description;
}
