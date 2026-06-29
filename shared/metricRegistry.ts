/**
 * Canonical metric definitions for creator attribution, campaign snapshots, and growth.
 * Builders, APIs, i18n tooltips, and UI display policy reference these IDs.
 */

import type { MetricValue } from './metricValue.js';

export type MetricKind = 'snapshot' | 'attribution' | 'period' | 'composite';
export type MetricOwner =
  | 'page_creator'
  | 'editor'
  | 'link_creator'
  | 'campaign'
  | 'derived';
export type SoftDeletePolicy =
  | 'exclude_deleted'
  | 'include_until_revoked'
  | 'never_revoke';
export type RefreshCadence = 'realtime' | 'cached_5m' | 'nightly' | 'frozen';
export type MetricDisplayPolicy = 'always' | 'adaptive';

export interface MetricRelevanceThreshold {
  minWords?: number;
  minPages?: number;
}

export interface MetricPrivacy {
  publicProfile: boolean;
  ownerProfile: boolean;
  campaignMember: boolean;
  publicApi: boolean;
}

export interface MetricDefinition {
  id: MetricId;
  kind: MetricKind;
  owner: MetricOwner;
  privacy: MetricPrivacy;
  /** Human-readable aggregation note for maintainers. */
  aggregation: string;
  softDeletePolicy: SoftDeletePolicy;
  refreshCadence: RefreshCadence;
  i18nLabelKey: string;
  i18nDescriptionKey: string;
  availableFrom?: string;
  displayPolicy?: MetricDisplayPolicy;
  relevanceThreshold?: MetricRelevanceThreshold;
}

export type MetricId =
  | 'snapshot.totalWords'
  | 'snapshot.pageCount'
  | 'snapshot.characterCount'
  | 'snapshot.locationCount'
  | 'snapshot.organizationCount'
  | 'snapshot.connectionCount'
  | 'snapshot.mapCount'
  | 'attribution.totalWordsCreated'
  | 'attribution.pagesCreated'
  | 'attribution.totalEdits'
  | 'attribution.charactersCreated'
  | 'attribution.locationsCreated'
  | 'attribution.organizationsCreated'
  | 'attribution.connectionsCreated'
  | 'attribution.campaignsContributedCount'
  | 'period.pagesCreated'
  | 'period.pagesEdited'
  | 'period.wordsGrowthEstimate'
  | 'period.connectionsCreated'
  | 'period.charactersCreated'
  | 'period.locationsCreated';

export type MetricContext =
  | 'publicProfile'
  | 'ownerProfile'
  | 'campaignMember'
  | 'publicApi';

const DEFAULT_ADAPTIVE_THRESHOLD: MetricRelevanceThreshold = {
  minWords: 5_000,
  minPages: 20,
};

export const METRIC_REGISTRY: Record<MetricId, MetricDefinition> = {
  'snapshot.totalWords': {
    id: 'snapshot.totalWords',
    kind: 'snapshot',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation:
      'SUM(WikiPageStats.wordCount) WHERE page.deletedAt IS NULL AND campaignId',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.totalWords',
    i18nDescriptionKey: 'campaign.worldStats.metric.totalWordsDescription',
    displayPolicy: 'always',
  },
  'snapshot.pageCount': {
    id: 'snapshot.pageCount',
    kind: 'snapshot',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(wikiPage) WHERE deletedAt IS NULL',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.pageCount',
    i18nDescriptionKey: 'campaign.worldStats.metric.pageCountDescription',
    displayPolicy: 'always',
  },
  'snapshot.characterCount': {
    id: 'snapshot.characterCount',
    kind: 'snapshot',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'buildCampaignSizeSnapshot characterCount',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.characterCount',
    i18nDescriptionKey: 'campaign.worldStats.metric.characterCountDescription',
    displayPolicy: 'always',
  },
  'snapshot.locationCount': {
    id: 'snapshot.locationCount',
    kind: 'snapshot',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'buildCampaignSizeSnapshot locationCount',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.locationCount',
    i18nDescriptionKey: 'campaign.worldStats.metric.locationCountDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'snapshot.organizationCount': {
    id: 'snapshot.organizationCount',
    kind: 'snapshot',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'buildCampaignSizeSnapshot organizationCount',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.organizationCount',
    i18nDescriptionKey: 'campaign.worldStats.metric.organizationCountDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'snapshot.connectionCount': {
    id: 'snapshot.connectionCount',
    kind: 'snapshot',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(wikiLink) OR SUM outboundLinkCount',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.connectionCount',
    i18nDescriptionKey: 'campaign.worldStats.metric.connectionCountDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'snapshot.mapCount': {
    id: 'snapshot.mapCount',
    kind: 'snapshot',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'buildCampaignSizeSnapshot mapCount',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.mapCount',
    i18nDescriptionKey: 'campaign.worldStats.metric.mapCountDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'attribution.totalWordsCreated': {
    id: 'attribution.totalWordsCreated',
    kind: 'attribution',
    owner: 'page_creator',
    privacy: {
      publicProfile: true,
      ownerProfile: true,
      campaignMember: false,
      publicApi: true,
    },
    aggregation:
      'SUM(WikiPageStats.wordCount) WHERE WikiPage.createdByUserId = user AND deletedAt IS NULL — all non-archived campaigns',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorStats.metric.totalWordsCreated',
    i18nDescriptionKey: 'profile.creatorStats.metric.totalWordsCreatedDescription',
    displayPolicy: 'always',
  },
  'attribution.pagesCreated': {
    id: 'attribution.pagesCreated',
    kind: 'attribution',
    owner: 'page_creator',
    privacy: {
      publicProfile: true,
      ownerProfile: true,
      campaignMember: false,
      publicApi: true,
    },
    aggregation: 'COUNT(WikiPage) WHERE createdByUserId = user AND deletedAt IS NULL',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorStats.metric.pagesCreated',
    i18nDescriptionKey: 'profile.creatorStats.metric.pagesCreatedDescription',
    displayPolicy: 'always',
  },
  'attribution.totalEdits': {
    id: 'attribution.totalEdits',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_EDITED) WHERE actorUserId = user',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorStats.metric.totalEdits',
    i18nDescriptionKey: 'profile.creatorStats.metric.totalEditsDescription',
    displayPolicy: 'always',
  },
  'attribution.charactersCreated': {
    id: 'attribution.charactersCreated',
    kind: 'attribution',
    owner: 'page_creator',
    privacy: {
      publicProfile: true,
      ownerProfile: true,
      campaignMember: false,
      publicApi: true,
    },
    aggregation: 'COUNT pages created by user with character codex type',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorStats.metric.charactersCreated',
    i18nDescriptionKey: 'profile.creatorStats.metric.charactersCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'attribution.locationsCreated': {
    id: 'attribution.locationsCreated',
    kind: 'attribution',
    owner: 'page_creator',
    privacy: {
      publicProfile: true,
      ownerProfile: true,
      campaignMember: false,
      publicApi: true,
    },
    aggregation: 'COUNT pages created by user with location codex type',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorStats.metric.locationsCreated',
    i18nDescriptionKey: 'profile.creatorStats.metric.locationsCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'attribution.organizationsCreated': {
    id: 'attribution.organizationsCreated',
    kind: 'attribution',
    owner: 'page_creator',
    privacy: {
      publicProfile: true,
      ownerProfile: true,
      campaignMember: false,
      publicApi: true,
    },
    aggregation: 'COUNT pages created by user with organization codex type',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorStats.metric.organizationsCreated',
    i18nDescriptionKey: 'profile.creatorStats.metric.organizationsCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'attribution.connectionsCreated': {
    id: 'attribution.connectionsCreated',
    kind: 'attribution',
    owner: 'link_creator',
    privacy: {
      publicProfile: true,
      ownerProfile: true,
      campaignMember: false,
      publicApi: true,
    },
    aggregation: 'COUNT(NarrativeEvent LINK_CREATED) WHERE actorUserId = user',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorStats.metric.connectionsCreated',
    i18nDescriptionKey: 'profile.creatorStats.metric.connectionsCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'attribution.campaignsContributedCount': {
    id: 'attribution.campaignsContributedCount',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: true,
      ownerProfile: true,
      campaignMember: false,
      publicApi: true,
    },
    aggregation:
      'COUNT DISTINCT non-archived campaignId from memberships OR edit events — includes private campaigns',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorStats.metric.campaignsContributedCount',
    i18nDescriptionKey: 'profile.creatorStats.metric.campaignsContributedCountDescription',
    displayPolicy: 'always',
  },
  'period.pagesCreated': {
    id: 'period.pagesCreated',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_CREATED) in window',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.periodPagesCreated',
    i18nDescriptionKey: 'campaign.worldStats.metric.periodPagesCreatedDescription',
    displayPolicy: 'always',
  },
  'period.pagesEdited': {
    id: 'period.pagesEdited',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_EDITED) in window',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.periodPagesEdited',
    i18nDescriptionKey: 'campaign.worldStats.metric.periodPagesEditedDescription',
    displayPolicy: 'always',
  },
  'period.wordsGrowthEstimate': {
    id: 'period.wordsGrowthEstimate',
    kind: 'period',
    owner: 'derived',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'Sum wordCount delta on PAGE_EDITED pages in window (approximation)',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.periodWordsGrowth',
    i18nDescriptionKey: 'campaign.worldStats.metric.periodWordsGrowthDescription',
    displayPolicy: 'always',
  },
  'period.connectionsCreated': {
    id: 'period.connectionsCreated',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent LINK_CREATED) in window',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.periodConnectionsCreated',
    i18nDescriptionKey: 'campaign.worldStats.metric.periodConnectionsCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'period.charactersCreated': {
    id: 'period.charactersCreated',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_CREATED) on character pages in window',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.periodCharactersCreated',
    i18nDescriptionKey: 'campaign.worldStats.metric.periodCharactersCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'period.locationsCreated': {
    id: 'period.locationsCreated',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: false,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_CREATED) on location pages in window',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldStats.metric.periodLocationsCreated',
    i18nDescriptionKey: 'campaign.worldStats.metric.periodLocationsCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
};

export function getMetricDefinition(id: MetricId): MetricDefinition {
  return METRIC_REGISTRY[id];
}

export function isMetricAllowedInContext(
  id: MetricId,
  context: MetricContext,
): boolean {
  const def = METRIC_REGISTRY[id];
  switch (context) {
    case 'publicProfile':
      return def.privacy.publicProfile;
    case 'ownerProfile':
      return def.privacy.ownerProfile;
    case 'campaignMember':
      return def.privacy.campaignMember;
    case 'publicApi':
      return def.privacy.publicApi;
    default:
      return false;
  }
}

export function filterMetricsByPrivacy<T extends MetricId>(
  metrics: Partial<Record<T, MetricValue>>,
  context: MetricContext,
): Partial<Record<T, MetricValue>> {
  const out: Partial<Record<T, MetricValue>> = {};
  for (const [key, value] of Object.entries(metrics) as [T, MetricValue][]) {
    if (isMetricAllowedInContext(key, context)) {
      out[key] = value;
    }
  }
  return out;
}

export function listMetricIds(kind?: MetricKind): MetricId[] {
  return (Object.keys(METRIC_REGISTRY) as MetricId[]).filter(
    (id) => !kind || METRIC_REGISTRY[id].kind === kind,
  );
}
