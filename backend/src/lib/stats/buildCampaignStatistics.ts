import { prisma } from '../prisma.js';
import type { CampaignContext } from '../../types/api.js';
import type { CampaignStatistics, CampaignStatistic } from '../../../../shared/dashboardCampaignFeatures.js';
import { metricUnavailable, metricValue } from '../../../../shared/metricValue.js';
import { dashboardVisibility, dashboardVisiblePages } from '../dashboardContent.js';
import { CampaignCapabilities as C } from '../../../../shared/campaignPolicy/capabilities.js';
import { getContentPresenceMetaMap } from '../contentPresenceService.js';
import { ContentPresenceEntityType as E } from '../../../../shared/contentPresence.js';
import { parseQuestMetadata } from '../questMetadata.js';
import { parseThreadMetadata } from '../threadMetadata.js';
import { resolveWikiCodexType } from '../resolveWikiCodexType.js';
import { createHash } from 'node:crypto';

const cache = new Map<string, { expires: number; value: CampaignStatistics }>();
export async function buildCampaignStatistics(ctx: CampaignContext, days = 30): Promise<CampaignStatistics> {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: ctx.campaignId }, select: { currentEpochMinute: true, createdAt: true } });
  const identity = ctx.actor.kind === 'member' ? ctx.actor.userId : 'public';
  // Current authorization is rechecked on every read, including cache hits.
  // These are current page projections and bounded event headers, never note
  // bodies, page revisions, recording content, or full narrative history.
  const pages = await dashboardVisiblePages(ctx);
  const pageIds = pages.map(page => page.id);
  const events = await prisma.calendarEvent.findMany({ where: { calendar: { campaignId: ctx.campaignId }, visibility: { in: dashboardVisibility(ctx, true) },
    OR: [{ wikiPageId: null }, { wikiPageId: { in: pageIds } }] },
    select: { id: true, importance: true, targetEpochMinute: true }, take: 10001 });
  const states = ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW) ? new Map() : await getContentPresenceMetaMap(ctx.campaignId, E.TIMELINE_EVENT, events.map(event => event.id));
  const visibleEvents = events.filter(event => { const presence = states.get(event.id); return !presence || (presence.state === 'REVEALED' && (presence.availableFromEpochMinute == null || BigInt(presence.availableFromEpochMinute) <= campaign.currentEpochMinute)); });
  const revision = createHash('sha256').update(JSON.stringify([pages, visibleEvents], (_key, value) => typeof value === 'bigint' ? value.toString() : value)).digest('hex');
  const key = JSON.stringify([ctx.campaignId, identity, [...ctx.capabilities].sort(), revision, days, campaign.currentEpochMinute.toString()]);
  const now = new Date();
  const hit = cache.get(key);
  if (hit && hit.expires > now.getTime()) return hit.value;
  const from = new Date(now.getTime() - days * 86400000);
  const previousFrom = new Date(from.getTime() - days * 86400000);
  const intervals = [{ gte: from, lt: now }, { gte: previousFrom, lt: from }];
  const period = await Promise.all(intervals.map(async range => {
    const [sessions, attendance, edits, creations] = await Promise.all([
      prisma.campaignSessionSchedule.count({ where: { status: 'COMPLETED', plannedStartAt: range, timelinePoint: { campaignId: ctx.campaignId, wikiPageId: { in: pageIds } } } }),
      prisma.sessionAttendance.count({ where: { status: 'ATTENDING', timelinePoint: { campaignId: ctx.campaignId, wikiPageId: { in: pageIds }, schedule: { status: 'COMPLETED', plannedStartAt: range } } } }),
      prisma.narrativeEvent.count({ where: { campaignId: ctx.campaignId, pageId: { in: pageIds }, source: 'user', type: 'PAGE_EDITED', createdAt: range } }),
      prisma.narrativeEvent.count({ where: { campaignId: ctx.campaignId, pageId: { in: pageIds }, source: 'user', type: 'PAGE_CREATED', createdAt: range } }),
    ]);
    return { sessions, attendance, edits, creations };
  }));
  const metrics: CampaignStatistic[] = [];
  const measured = (id: keyof typeof period[number], category: CampaignStatistic['category'], label: string, explanation: string) => metrics.push({
    id, category, label, value: metricValue(period[0][id]), previous: metricValue(period[1][id]), explanation,
  });
  measured('sessions', 'Sessions', 'Completed sessions', 'Explicitly completed visible sessions, grouped by recorded scheduled start date. Undated completions are not assigned to a period.');
  measured('attendance', 'Participation', 'Recorded attending responses', 'Attendance responses on completed visible sessions in this period. A response does not prove actual attendance.');
  measured('edits', 'Activity', 'Recorded page edits', 'User-authored PAGE_EDITED records on pages currently visible to you. This is real-world edit activity, not world chronology.');
  measured('creations', 'Activity', 'Recorded page creations', 'User-authored PAGE_CREATED records on pages currently visible to you; imports and restores are excluded.');
  const snapshot = (id: string, category: CampaignStatistic['category'], label: string, amount: number, explanation: string) => metrics.push({ id, category, label, value: metricValue(amount), previous: metricUnavailable('not_yet_tracked'), explanation });
  snapshot('visiblePages', 'World', 'Visible pages now', pages.length, 'Current undeleted pages available to this viewer, including temporal and revelation access.');
  snapshot('activeQuests', 'Narrative', 'Active quests now', pages.filter(page => resolveWikiCodexType(page) === 'QUEST' && parseQuestMetadata(page.metadata).questStatus === 'ACTIVE').length,
    'Current visible quest state. Historical state snapshots are not available for this comparison.');
  snapshot('openThreads', 'Narrative', 'Open threads now', pages.filter(page => resolveWikiCodexType(page) === 'THREAD' && parseThreadMetadata(page.metadata).threadStatus === 'OPEN').length,
    'Current visible thread state, kept separate from real-world edits and dated world events.');
  snapshot('campaignDays', 'Time', 'Real-world campaign age (days)', Math.max(0, Math.floor((now.getTime() - campaign.createdAt.getTime()) / 86400000)), 'Elapsed real-world days since campaign creation; not in-world elapsed time.');
  for (const [id, category, label, explanation] of [
    ['playedDuration', 'Sessions', 'Actual played duration', 'Scheduled start/end ranges are not measurements of actual play.'],
    ['noteContributions', 'Participation', 'Dated note contributions', 'Empty placeholders and later note edits cannot establish historical contribution dates.'],
    ['worldChanges', 'World', 'World changes over time', 'Faction and development projections need an authorized historical metric contract before aggregation.'],
    ['worldElapsed', 'Time', 'In-world elapsed time', 'A reliable campaign origin and calendar-aware elapsed-time baseline are not recorded for this metric.'],
  ] as const) metrics.push({ id, category, label, value: metricUnavailable('not_yet_tracked'), previous: metricUnavailable('not_yet_tracked'), explanation });

  const incomplete = events.length > 10000 || visibleEvents.some(event => event.targetEpochMinute === null);
  const countImportance = (importance: string) => incomplete ? metricUnavailable('insufficient_data') : metricValue(visibleEvents.filter(event => event.importance === importance && event.targetEpochMinute! <= campaign.currentEpochMinute).length);
  const value: CampaignStatistics = { days, computedAt: now.toISOString(), from: from.toISOString(), to: now.toISOString(), comparisonFrom: previousFrom.toISOString(), metrics,
    chronology: { major: countImportance('MAJOR'), minor: countImportance('MINOR'), notice: countImportance('NOTICE'),
      label: 'In-world snapshot: dated event records up to the current world minute, not real-world activity. Custom dates without canonical epoch values or more than 10,000 records make these totals unavailable; recurring occurrences are not inferred.' } };
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: now.getTime() + 5 * 60000, value });
  return value;
}
