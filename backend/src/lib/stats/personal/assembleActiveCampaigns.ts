import type { ActiveCampaignSummary } from '../../../../../shared/statsTypes.js';
import { calendarDateKey } from './zonedTime.js';

export type ActiveCampaignActivityPoint = {
  campaignId: string;
  at: Date;
  /** Wiki page id when the event touches a document. */
  pageId?: string | null;
  /** When false, the point still marks the day / page but does not add to contributions. */
  countsAsContribution?: boolean;
};

export type ActiveCampaignMeta = {
  id: string;
  name: string;
  handle: string;
  coverImageUrl: string | null;
};

const DEFAULT_LIMIT = 3;

/**
 * Rank campaigns by meaningful period activity.
 * Primary: distinct active civil days. Secondary: qualified contribution count.
 * Word volume is intentionally not used for ranking.
 */
export function assembleActiveCampaigns(input: {
  timeZone: string;
  rangeStart: Date | null;
  rangeEnd: Date;
  points: ActiveCampaignActivityPoint[];
  campaigns: Map<string, ActiveCampaignMeta>;
  limit?: number;
}): ActiveCampaignSummary[] {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const start = input.rangeStart ?? new Date(0);
  const end = input.rangeEnd;

  const byCampaign = new Map<
    string,
    { days: Set<string>; contributions: number; pages: Set<string> }
  >();

  for (const point of input.points) {
    if (point.at < start || point.at >= end) continue;
    if (!input.campaigns.has(point.campaignId)) continue;
    const bucket = byCampaign.get(point.campaignId) ?? {
      days: new Set<string>(),
      contributions: 0,
      pages: new Set<string>(),
    };
    bucket.days.add(calendarDateKey(point.at, input.timeZone));
    if (point.countsAsContribution !== false) {
      bucket.contributions += 1;
    }
    const pageId = point.pageId?.trim();
    if (pageId) bucket.pages.add(pageId);
    byCampaign.set(point.campaignId, bucket);
  }

  return [...byCampaign.entries()]
    .map(([campaignId, bucket]) => {
      const meta = input.campaigns.get(campaignId);
      if (!meta || bucket.contributions <= 0) return null;
      return {
        id: meta.id,
        name: meta.name,
        handle: meta.handle,
        href: `/campaigns/${meta.handle}/dashboard`,
        coverImageUrl: meta.coverImageUrl,
        activeDays: bucket.days.size,
        contributions: bucket.contributions,
        pagesTouched: bucket.pages.size,
      } satisfies ActiveCampaignSummary;
    })
    .filter((row): row is ActiveCampaignSummary => row != null)
    .sort((a, b) => {
      if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
      if (b.contributions !== a.contributions) {
        return b.contributions - a.contributions;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
