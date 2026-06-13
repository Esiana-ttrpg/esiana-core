import type { ConvergenceTimelineEntry } from '@/lib/chronologyOverlayApi';

const WORLD_ADVANCE_DOMAIN = 'world_advance';

export type WorldAdvanceBatchFeedGroup = {
  kind: 'world_advance_batch';
  batchEventId: string;
  headline: string;
  entries: ConvergenceTimelineEntry[];
};

export type FeedListItem =
  | { kind: 'entry'; entry: ConvergenceTimelineEntry }
  | WorldAdvanceBatchFeedGroup;

/** Collapse WORLD_ADVANCE anchors that share the same chronology batch event. */
export function groupDomainFeedItems(
  domain: string,
  entries: ConvergenceTimelineEntry[],
): FeedListItem[] {
  if (domain !== WORLD_ADVANCE_DOMAIN) {
    return entries.map((entry) => ({ kind: 'entry', entry }));
  }

  const byBatch = new Map<string, ConvergenceTimelineEntry[]>();
  for (const entry of entries) {
    const key = entry.source.entityId;
    const list = byBatch.get(key) ?? [];
    list.push(entry);
    byBatch.set(key, list);
  }

  return [...byBatch.values()].map((batchEntries) => {
    const first = batchEntries[0]!;
    const headline =
      first.display.summary?.trim() ||
      first.display.title?.trim() ||
      'World advance';
    return {
      kind: 'world_advance_batch' as const,
      batchEventId: first.source.entityId,
      headline,
      entries: batchEntries,
    };
  });
}
