/** Additive, read-only presentation contract for the campaign feed. */
export type FeedImportance = 'MAJOR' | 'MINOR' | 'NOTICE';
export interface FeedEntryMetadata {
  category?: { id: string; campaignId: string; name: string; color: string | null; icon: string | null } | null;
  calendarId?: string;
  calendarName?: string;
  nativeDateLabel?: string;
  datePrecision: 'day' | 'minute' | 'undated' | 'unaligned';
  importance?: FeedImportance;
  occurrenceId?: string;
  occurrenceIndex?: number;
  duration?: number;
  endEpochMinute?: string;
  groupId?: string;
  groupTitle?: string;
  provenance?: string[];
  referenceDay?: string;
  originLabel?: string;
  nativeStart?: { year: number | null; month: number | null; day: number | null };
  nativeEnd?: { year: number | null; month: number | null; day: number | null };
}
export interface CampaignFeedCoverage {
  requestedRange: { mode: 'EPOCH_RANGE'; from: string; to: string };
  sourceWarnings: { source: string; code: string; message: string }[];
  gaps: string[];
  undated: { limit: number; capped: boolean; returned: number };
  unaligned: { limit: number; capped: boolean; returned: number };
  order: 'asc' | 'desc';
  includeFuture: boolean;
  todayEndEpochMinute: string;
  availableRange: { from: string | null; to: string | null };
}
export function feedExcerpt(value: string | null | undefined, limit = 400): string | null {
  const plain = (value ?? '').replace(/<[^>]*>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_`~>]/g, '').replace(/\s+/g, ' ').trim();
  if (!plain) return null;
  if (plain.length <= limit) return plain;
  const cut = plain.slice(0, limit - 1);
  const boundary = cut.lastIndexOf(' ');
  return boundary > 0 ? `${cut.slice(0, boundary)}…` : '…';
}
export function feedRange(now: bigint, offset = 0n) {
  const delta = now - offset;
  const day = delta / 1440n - (delta < 0n && delta % 1440n !== 0n ? 1n : 0n);
  const to = offset + (day + 1n) * 1440n;
  return { from: String(to - 30n * 1440n), to: String(to) };
}
export function shiftFeedRange(from: string, to: string, direction: -1 | 1) {
  const start = BigInt(from), end = BigInt(to), span = end - start;
  return { from: String(start + span * BigInt(direction)), to: String(end + span * BigInt(direction)) };
}
export function narrowFeedRange(from: string, to: string) {
  const start = BigInt(from), end = BigInt(to);
  return { from: String(start + (end - start) / 2n), to };
}
