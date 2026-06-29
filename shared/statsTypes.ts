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
