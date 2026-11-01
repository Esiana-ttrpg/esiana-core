import type { ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';
import { feedExcerpt, type FeedImportance } from '../../../shared/campaignFeed.js';

export function sessionSummaryExcerpt(blocks: unknown): string | null {
  // Only explicitly identified canonical summary/body blocks; never fall back to arbitrary text or transcripts.
  if (!Array.isArray(blocks)) return null;
  const block = ['session-summary', 'session-recap', 'session-note-body'].map(id => blocks.find(row => row && row.id === id
    && row.isPrivate !== true && row.visibility !== 'DM_Only')).find(row => !!row);
  return typeof block?.content?.markdown === 'string' ? feedExcerpt(block.content.markdown) : null;
}
export function orderFeedEntries(entries: ConvergenceTimelineEntry[], order: 'asc' | 'desc') {
  return [...entries].sort((a, b) => {
    const left = a.instant.epochMinute === null ? null : BigInt(a.instant.epochMinute);
    const right = b.instant.epochMinute === null ? null : BigInt(b.instant.epochMinute);
    if (left === null || right === null) return left === right ? a.entryId.localeCompare(b.entryId) : left === null ? 1 : -1;
    return (left < right ? -1 : left > right ? 1 : 0) * (order === 'desc' ? -1 : 1) || a.entryId.localeCompare(b.entryId);
  });
}
export function matchesFeedWindow(entry: ConvergenceTimelineEntry, from: bigint, to: bigint, now: bigint, todayEnd: bigint, includeFuture: boolean) {
  if (entry.instant.epochMinute === null) return true;
  const start = BigInt(entry.instant.epochMinute);
  const cutoff = entry.feed?.datePrecision === 'day' ? todayEnd : now + 1n;
  return start >= from && start < to && (includeFuture || start < cutoff);
}
export function filterFeedImportance(entries: ConvergenceTimelineEntry[], importance: FeedImportance[]) {
  return entries.filter(entry => !entry.feed?.importance || importance.includes(entry.feed.importance));
}
