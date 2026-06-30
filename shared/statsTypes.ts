import type { MetricId } from './metricRegistry.js';
import type { MetricValue } from './metricValue.js';

export type WorldbuildingMixEntry = {
  codexType: string;
  count: number;
};

export type CampaignWorldStatsResponse = {
  computedAt: string;
  refreshCadence: 'cached_5m';
  periodDays: number;
  snapshot: Partial<Record<MetricId, MetricValue>>;
  period: Partial<Record<MetricId, MetricValue>>;
  recentEditors?: RecentEditor[];
};

export type RecentEditor = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  editsInPeriod: number;
};

export type UserActivityItem = {
  id: string;
  source: 'campaign_activity' | 'narrative_event';
  type: string;
  createdAt: string;
  campaign: LinkableCampaign | null;
  line: string;
  href: string | null;
  metadata?: { wordDelta?: number };
};

export type UserActivityResponse = {
  items: UserActivityItem[];
  hasMore: boolean;
};

export type LinkableCampaign = {
  id: string;
  name: string;
  handle: string;
  isLookingForGroup: boolean;
};

export type CreatorAttributionResponse = {
  computedAt: string;
  refreshCadence: 'realtime';
  metrics: Partial<Record<MetricId, MetricValue>>;
  worldbuildingMix: WorldbuildingMixEntry[];
  linkableCampaigns: LinkableCampaign[];
};
