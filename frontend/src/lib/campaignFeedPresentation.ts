import type { ConvergenceTimelineEntry } from './chronologyOverlayApi';
export const FEED_SOURCES = {
  world_event: 'Chronology', session_chronicle: 'Sessions', downtime_period: 'Downtime',
  org_relation: 'Factions', world_advance: 'World developments',
} as const;
export function groupCampaignFeed(entries: ConvergenceTimelineEntry[], sessions = false) {
  const groups = new Map<string, { key: string; title: string; entries: ConvergenceTimelineEntry[] }>();
  for (const entry of entries) {
    const key = entry.instant.epochMinute === null ? entry.feed?.datePrecision === 'unaligned' ? `native:${entry.feed.calendarId}` : 'undated'
      : sessions && entry.sessionLink ? `session:${entry.sessionLink.timelinePointId}`
      : `date:${entry.feed?.referenceDay ?? entry.display.dateLabel ?? entry.instant.epochMinute}`;
    const title = key.startsWith('session:') ? `Session ${entry.sessionLink!.sequenceOrder}`
      : key.startsWith('native:') ? `${entry.feed?.calendarName ?? 'Calendar'} · native dates only`
      : key === 'undated' ? 'Undated' : entry.display.dateLabel ?? 'Date unavailable';
    const group = groups.get(key) ?? { key, title, entries: [] };
    group.entries.push(entry); groups.set(key, group);
  }
  return [...groups.values()];
}
/** Presentation grouping never discards distinct source or occurrence identities. */
export function groupFeedDevelopments(entries: ConvergenceTimelineEntry[]) {
  const groups = new Map<string, { key: string; title?: string; entries: ConvergenceTimelineEntry[] }>();
  for (const entry of entries) {
    const key = entry.feed?.groupId ?? entry.entryId;
    const group = groups.get(key) ?? { key, title: entry.feed?.groupTitle, entries: [] };
    group.entries.push(entry); groups.set(key, group);
  }
  return [...groups.values()];
}
