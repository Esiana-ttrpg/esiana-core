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

export type PersonalStatisticsVisibility =
  | 'owner'
  | 'viewerAuthorized'
  | 'public';

export type PersonalStatisticsRangeMode =
  | 'all_time'
  | 'year'
  | 'month'
  | 'custom';

export type StatsCategory =
  | 'writing'
  | 'worldbuilding'
  | 'maps'
  | 'chronology'
  | 'campaigns';

export type WritingDayCompleteness = 'measured' | 'partial' | 'none';

export type WritingHeatmapDay = {
  date: string;
  weekday: number;
  wordsAdded: number;
  wordsRemoved: number;
  sessionCount: number;
  sessionMinutes: number;
  completeness: WritingDayCompleteness;
};

export type WritingWeeklyRhythmBucket = {
  weekday: number;
  wordsAdded: number;
  sessionMinutes: number;
};

export type WritingHourlyBucket = {
  hour: number;
  wordsAdded: number;
  sessionMinutes: number;
};

export type WritingAddedRemovedPoint = {
  date: string;
  wordsAdded: number;
  wordsRemoved: number;
  completeness: WritingDayCompleteness;
};

export type WritingVisualizationDocument = {
  id: string;
  title: string;
  href: string;
};

export type WritingVisualizationSession = {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  activeDurationMs: number;
  completeness: string;
  documents: WritingVisualizationDocument[];
};

export type WritingVisualizations = {
  timeZone: string;
  window: { start: string; end: string };
  heatmap: WritingHeatmapDay[];
  weeklyRhythm: WritingWeeklyRhythmBucket[];
  hourly: WritingHourlyBucket[];
  addedRemovedTrend: WritingAddedRemovedPoint[];
  sessions: WritingVisualizationSession[];
};

export type PersonalStatisticsResponse = {
  version: 1;
  computedAt: string;
  refreshCadence: 'realtime';
  timeZone: string;
  visibilityContext: PersonalStatisticsVisibility;
  range: {
    mode: PersonalStatisticsRangeMode;
    start: string | null;
    end: string;
  };
  campaignId: string | null;
  snapshot: Partial<Record<MetricId, MetricValue>>;
  period: Partial<Record<MetricId, MetricValue>>;
  habits: Partial<Record<MetricId, MetricValue>>;
  worldbuildingMix: WorldbuildingMixEntry[];
  linkableCampaigns: LinkableCampaign[];
  /** Owner-only writing charts. Omitted for public and compatibility adapters. */
  visualizations?: WritingVisualizations | null;
};

export type PersonalStatisticsExportMetricDefinition = {
  id: string;
  unit: string;
  source: string;
  timeSemantics: string;
  attributionRules: string;
  historicalCompleteness: string;
  reportingClock: string;
  aggregation: string;
};

export type PersonalStatisticsExportContribution = {
  id: string;
  occurredAt: string;
  campaignId: string;
  documentId: string;
  sourceId: string;
  wordsAdded: number;
  wordsRemoved: number;
  netChange: number;
  origin: string;
  availability: string;
  writingSessionId: string | null;
  narrativeEventId: string | null;
};

export type PersonalStatisticsExportDailyAggregate = {
  date: string;
  wordsAdded: number;
  wordsRemoved: number;
  netChange: number;
  sessionCount: number;
  sessionMinutes: number;
  completeness: WritingDayCompleteness;
};

export type PersonalStatisticsExportSession = {
  id: string;
  campaignId: string;
  startedAt: string;
  endedAt: string | null;
  activeDurationMs: number;
  completeness: string;
  documentIds: string[];
};

export type PersonalStatisticsExportJson = {
  version: 1;
  exportedAt: string;
  timeZone: string;
  visibilityContext: 'owner';
  range: PersonalStatisticsResponse['range'];
  campaignId: string | null;
  provenance: {
    timestamps: 'UTC';
    reportingClock: 'real_world';
    notes: string[];
  };
  metricDefinitions: PersonalStatisticsExportMetricDefinition[];
  snapshot: PersonalStatisticsResponse['snapshot'];
  period: PersonalStatisticsResponse['period'];
  habits: PersonalStatisticsResponse['habits'];
  contributions: PersonalStatisticsExportContribution[];
  dailyAggregates: PersonalStatisticsExportDailyAggregate[];
  writingSessions: PersonalStatisticsExportSession[];
};
