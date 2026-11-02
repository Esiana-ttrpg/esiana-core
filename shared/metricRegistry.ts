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
export type MetricUnit =
  | 'words'
  | 'pages'
  | 'edits'
  | 'entities'
  | 'connections'
  | 'campaigns'
  | 'days'
  | 'days_per_week'
  | 'hour_of_day'
  | 'count';
export type MetricTimeSemantics = 'snapshot' | 'activity_in_period' | 'lifetime';
export type MetricHistoricalCompleteness =
  | 'measured'
  | 'estimated'
  | 'partial'
  | 'unavailable';
export type MetricReportingClock = 'real_world' | 'in_world';

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
  unit: MetricUnit;
  source: string;
  timeSemantics: MetricTimeSemantics;
  attributionRules: string;
  historicalCompleteness: MetricHistoricalCompleteness;
  /** Personal and campaign activity reporting uses the real-world clock. */
  reportingClock: MetricReportingClock;
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
  | 'period.locationsCreated'
  | 'period.wordsAdded'
  | 'attribution.wordsAdded'
  | 'attribution.wordsAddedMeasured'
  | 'attribution.wordsRemoved'
  | 'attribution.netChange'
  | 'attribution.writingStreak'
  | 'attribution.writingCadence'
  | 'attribution.substantialRevisions'
  | 'attribution.favoriteWritingHour';

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
    unit: 'words',
    source: 'WikiPageStats.wordCount',
    timeSemantics: 'snapshot',
    attributionRules: 'Campaign-scoped current authorized records; not personal attribution.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.totalWords',
    i18nDescriptionKey: 'campaign.worldstats.totalWordsDescription',
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
    unit: 'pages',
    source: 'WikiPage',
    timeSemantics: 'snapshot',
    attributionRules: 'Campaign-scoped current authorized records; not personal attribution.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.pageCount',
    i18nDescriptionKey: 'campaign.worldstats.pageCountDescription',
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
    unit: 'entities',
    source: 'WikiPage + resolveWikiCodexType',
    timeSemantics: 'snapshot',
    attributionRules: 'Campaign-scoped current authorized records; not personal attribution.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.characterCount',
    i18nDescriptionKey: 'campaign.worldstats.characterCountDescription',
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
    unit: 'entities',
    source: 'WikiPage + resolveWikiCodexType',
    timeSemantics: 'snapshot',
    attributionRules: 'Campaign-scoped current authorized records; not personal attribution.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.locationCount',
    i18nDescriptionKey: 'campaign.worldstats.locationCountDescription',
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
    unit: 'entities',
    source: 'WikiPage + resolveWikiCodexType',
    timeSemantics: 'snapshot',
    attributionRules: 'Campaign-scoped current authorized records; not personal attribution.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.organizationCount',
    i18nDescriptionKey: 'campaign.worldstats.organizationCountDescription',
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
    unit: 'connections',
    source: 'WikiLink / WikiPageStats.outboundLinkCount',
    timeSemantics: 'snapshot',
    attributionRules: 'Campaign-scoped current authorized records; not personal attribution.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.connectionCount',
    i18nDescriptionKey: 'campaign.worldstats.connectionCountDescription',
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
    unit: 'count',
    source: 'Asset.type=map and/or image-display blocks',
    timeSemantics: 'snapshot',
    attributionRules: 'Campaign-scoped current authorized records; not personal attribution.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.mapCount',
    i18nDescriptionKey: 'campaign.worldstats.mapCountDescription',
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
    unit: 'words',
    source: 'WikiPage.createdByUserId + WikiPageStats.wordCount',
    timeSemantics: 'snapshot',
    attributionRules:
      'Current word count on pages the user originally created — not words they typed. Later editors inflate this total.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.totalWordsCreated',
    i18nDescriptionKey: 'profile.creatorstats.totalWordsCreatedDescription',
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
    unit: 'pages',
    source: 'WikiPage.createdByUserId',
    timeSemantics: 'snapshot',
    attributionRules: 'Undeleted pages originally created by the user in current non-archived memberships.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.pagesCreated',
    i18nDescriptionKey: 'profile.creatorstats.pagesCreatedDescription',
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
    unit: 'edits',
    source: 'NarrativeEvent PAGE_EDITED.actorUserId',
    timeSemantics: 'lifetime',
    attributionRules: 'Each user-attributed PAGE_EDITED event counts once. Creates do not count. Owner-only.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.totalEdits',
    i18nDescriptionKey: 'profile.creatorstats.totalEditsDescription',
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
    unit: 'entities',
    source: 'WikiPage.createdByUserId + resolveWikiCodexType(templateType, metadata)',
    timeSemantics: 'snapshot',
    attributionRules:
      'Created-page set filtered to CHARACTER. Page id is not passed, so tree category resolution does not run.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.charactersCreated',
    i18nDescriptionKey: 'profile.creatorstats.charactersCreatedDescription',
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
    unit: 'entities',
    source: 'WikiPage.createdByUserId + resolveWikiCodexType(templateType, metadata)',
    timeSemantics: 'snapshot',
    attributionRules:
      'Created-page set filtered to LOCATION. Page id is not passed, so tree category resolution does not run.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.locationsCreated',
    i18nDescriptionKey: 'profile.creatorstats.locationsCreatedDescription',
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
    unit: 'entities',
    source: 'WikiPage.createdByUserId + resolveWikiCodexType(templateType, metadata)',
    timeSemantics: 'snapshot',
    attributionRules:
      'Created-page set filtered to ORGANIZATION. Page id is not passed, so tree category resolution does not run.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.organizationsCreated',
    i18nDescriptionKey: 'profile.creatorstats.organizationsCreatedDescription',
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
    unit: 'connections',
    source: 'NarrativeEvent LINK_CREATED.actorUserId',
    timeSemantics: 'lifetime',
    attributionRules: 'Each LINK_CREATED event by this actor. Derived EntityRelation rows are not authorship.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.connectionsCreated',
    i18nDescriptionKey: 'profile.creatorstats.connectionsCreatedDescription',
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
    unit: 'campaigns',
    source: 'CampaignMember ∩ (WikiPage.createdByUserId ∪ NarrativeEvent.actorUserId)',
    timeSemantics: 'lifetime',
    attributionRules:
      'Current membership intersected with created pages or any actor events. Public and public-API aggregates use only public campaigns.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.campaignsContributedCount',
    i18nDescriptionKey: 'profile.creatorstats.campaignsContributedCountDescription',
    displayPolicy: 'always',
  },
  'period.pagesCreated': {
    id: 'period.pagesCreated',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_CREATED) in window',
    unit: 'pages',
    source: 'NarrativeEvent PAGE_CREATED',
    timeSemantics: 'activity_in_period',
    attributionRules: 'Campaign-scoped user-source events in the reporting window.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.periodPagesCreated',
    i18nDescriptionKey: 'campaign.worldstats.periodPagesCreatedDescription',
    displayPolicy: 'always',
  },
  'period.pagesEdited': {
    id: 'period.pagesEdited',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_EDITED) in window',
    unit: 'edits',
    source: 'NarrativeEvent PAGE_EDITED',
    timeSemantics: 'activity_in_period',
    attributionRules: 'Campaign-scoped user-source events in the reporting window.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.periodPagesEdited',
    i18nDescriptionKey: 'campaign.worldstats.periodPagesEditedDescription',
    displayPolicy: 'always',
  },
  'period.wordsGrowthEstimate': {
    id: 'period.wordsGrowthEstimate',
    kind: 'period',
    owner: 'derived',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'Sum wordCount delta on PAGE_EDITED pages in window (approximation)',
    unit: 'words',
    source: 'WikiPageStats.wordCount of pages edited in window',
    timeSemantics: 'activity_in_period',
    attributionRules: 'Approximation of growth, not measured words added.',
    historicalCompleteness: 'estimated',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.periodWordsGrowth',
    i18nDescriptionKey: 'campaign.worldstats.periodWordsGrowthDescription',
    displayPolicy: 'always',
  },
  'period.connectionsCreated': {
    id: 'period.connectionsCreated',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent LINK_CREATED) in window',
    unit: 'connections',
    source: 'NarrativeEvent LINK_CREATED',
    timeSemantics: 'activity_in_period',
    attributionRules: 'Campaign-scoped user-source events in the reporting window.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.periodConnectionsCreated',
    i18nDescriptionKey: 'campaign.worldstats.periodConnectionsCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'period.charactersCreated': {
    id: 'period.charactersCreated',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_CREATED) on character pages in window',
    unit: 'entities',
    source: 'NarrativeEvent PAGE_CREATED + character pages',
    timeSemantics: 'activity_in_period',
    attributionRules: 'Campaign-scoped user-source events in the reporting window.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.periodCharactersCreated',
    i18nDescriptionKey: 'campaign.worldstats.periodCharactersCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'period.locationsCreated': {
    id: 'period.locationsCreated',
    kind: 'period',
    owner: 'campaign',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: true,
      publicApi: false,
    },
    aggregation: 'COUNT(NarrativeEvent PAGE_CREATED) on location pages in window',
    unit: 'entities',
    source: 'NarrativeEvent PAGE_CREATED + location pages',
    timeSemantics: 'activity_in_period',
    attributionRules: 'Campaign-scoped user-source events in the reporting window.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.periodLocationsCreated',
    i18nDescriptionKey: 'campaign.worldstats.periodLocationsCreatedDescription',
    displayPolicy: 'adaptive',
    relevanceThreshold: DEFAULT_ADAPTIVE_THRESHOLD,
  },
  'period.wordsAdded': {
    id: 'period.wordsAdded',
    kind: 'period',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: true,
      publicApi: false,
    },
    aggregation:
      'SUM(WritingContribution.wordsAdded) in window; unmatched NarrativeEvent wordDelta as reconstructed net-only',
    unit: 'words',
    source: 'WritingContribution.wordsAdded',
    timeSemantics: 'activity_in_period',
    attributionRules:
      'Positive added tokens from measured diffs; historical events remain net-only reconstructed.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'cached_5m',
    i18nLabelKey: 'campaign.worldstats.periodWordsAdded',
    i18nDescriptionKey: 'campaign.worldstats.periodWordsAddedDescription',
    availableFrom: '1.3.0',
    displayPolicy: 'always',
  },
  'attribution.wordsAdded': {
    id: 'attribution.wordsAdded',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation:
      'SUM(WritingContribution.wordsAdded) in window; unmatched NarrativeEvent wordDelta as reconstructed net-only',
    unit: 'words',
    source: 'WritingContribution.wordsAdded (session wordDelta excluded)',
    timeSemantics: 'activity_in_period',
    attributionRules:
      'Owner-only. Measured added words from save/publication diffs; historical events contribute net-only reconstructed rows. Client writing-session wordDelta is not counted.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.wordsAdded',
    i18nDescriptionKey: 'profile.creatorstats.wordsAddedDescription',
    availableFrom: '1.3.0',
    displayPolicy: 'always',
  },
  'attribution.writingStreak': {
    id: 'attribution.writingStreak',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation:
      'Consecutive UTC days with editsCount > 0 or wordsAdded > 0 in UserWritingDailyRollup',
    unit: 'days',
    source: 'UserWritingDailyRollup (UTC; sessionCount also counts as active)',
    timeSemantics: 'activity_in_period',
    attributionRules:
      'Owner-only. Walks UTC days backward from today. Code also treats sessionCount > 0 as an active day.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.writingStreak',
    i18nDescriptionKey: 'profile.creatorstats.writingStreakDescription',
    availableFrom: '1.3.0',
    displayPolicy: 'always',
  },
  'attribution.writingCadence': {
    id: 'attribution.writingCadence',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation: 'Active writing days per week over 30d from UserWritingDailyRollup',
    unit: 'days_per_week',
    source: 'UserWritingDailyRollup active days / 30 * 7',
    timeSemantics: 'activity_in_period',
    attributionRules: 'Owner-only. UTC active days. Not a weekday histogram.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.writingCadence',
    i18nDescriptionKey: 'profile.creatorstats.writingCadenceDescription',
    availableFrom: '1.3.0',
    displayPolicy: 'always',
  },
  'attribution.substantialRevisions': {
    id: 'attribution.substantialRevisions',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation:
      'SUM(UserWritingDailyRollup.substantialRevisions) in 30d; threshold 40% word change per save',
    unit: 'edits',
    source: 'UserWritingDailyRollup.substantialRevisions',
    timeSemantics: 'activity_in_period',
    attributionRules:
      'Owner-only. Per-save increment when |net word delta| ≥ 40% of previous or new count. Same-length rewrites do not qualify.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.substantialRevisions',
    i18nDescriptionKey: 'profile.creatorstats.substantialRevisionsDescription',
    availableFrom: '1.3.0',
    displayPolicy: 'always',
  },
  'attribution.favoriteWritingHour': {
    id: 'attribution.favoriteWritingHour',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation:
      'peakHourUtc weighted by sessionMinutes from UserWritingDailyRollup over 30d',
    unit: 'hour_of_day',
    source: 'UserWritingDailyRollup.peakHourUtc + sessionMinutes',
    timeSemantics: 'activity_in_period',
    attributionRules:
      'Owner-only. UTC hour from writing-session flushes only; wiki saves do not set hour.',
    historicalCompleteness: 'estimated',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.favoriteWritingHour',
    i18nDescriptionKey: 'profile.creatorstats.favoriteWritingHourDescription',
    availableFrom: '1.3.0',
    displayPolicy: 'always',
  },
  'attribution.wordsAddedMeasured': {
    id: 'attribution.wordsAddedMeasured',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation: 'SUM(WritingContribution.wordsAdded) where availability = measured',
    unit: 'words',
    source: 'WritingContribution measured rows only',
    timeSemantics: 'activity_in_period',
    attributionRules:
      'Owner-only companion. Unicode word-boundary diff at save/publication. Does not replace attribution.wordsAdded.',
    historicalCompleteness: 'measured',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.wordsAddedMeasured',
    i18nDescriptionKey: 'profile.creatorstats.wordsAddedMeasuredDescription',
    availableFrom: '1.10.0',
    displayPolicy: 'always',
  },
  'attribution.wordsRemoved': {
    id: 'attribution.wordsRemoved',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation: 'SUM(WritingContribution.wordsRemoved) in window',
    unit: 'words',
    source: 'WritingContribution.wordsRemoved',
    timeSemantics: 'activity_in_period',
    attributionRules:
      'Owner-only companion. Measured removed tokens at save/publication; reconstructed rows never invent a removed side for a positive net.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.wordsRemoved',
    i18nDescriptionKey: 'profile.creatorstats.wordsRemovedDescription',
    availableFrom: '1.10.0',
    displayPolicy: 'always',
  },
  'attribution.netChange': {
    id: 'attribution.netChange',
    kind: 'attribution',
    owner: 'editor',
    privacy: {
      publicProfile: false,
      ownerProfile: true,
      campaignMember: false,
      publicApi: false,
    },
    aggregation: 'SUM(WritingContribution.netChange) in window',
    unit: 'words',
    source: 'WritingContribution.netChange',
    timeSemantics: 'activity_in_period',
    attributionRules:
      'Owner-only companion. added - removed for this save; not original authorship of the document.',
    historicalCompleteness: 'partial',
    reportingClock: 'real_world',
    softDeletePolicy: 'exclude_deleted',
    refreshCadence: 'realtime',
    i18nLabelKey: 'profile.creatorstats.netChange',
    i18nDescriptionKey: 'profile.creatorstats.netChangeDescription',
    availableFrom: '1.10.0',
    displayPolicy: 'always',
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

/** The 13 personal creator-attribution IDs frozen in Esiana 1.10 PR 1. */
export const PERSONAL_ATTRIBUTION_METRIC_IDS = [
  'attribution.totalWordsCreated',
  'attribution.pagesCreated',
  'attribution.totalEdits',
  'attribution.charactersCreated',
  'attribution.locationsCreated',
  'attribution.organizationsCreated',
  'attribution.connectionsCreated',
  'attribution.campaignsContributedCount',
  'attribution.wordsAdded',
  'attribution.writingStreak',
  'attribution.writingCadence',
  'attribution.substantialRevisions',
  'attribution.favoriteWritingHour',
] as const satisfies readonly MetricId[];

export const PUBLIC_PERSONAL_ATTRIBUTION_METRIC_IDS = [
  'attribution.totalWordsCreated',
  'attribution.pagesCreated',
  'attribution.charactersCreated',
  'attribution.locationsCreated',
  'attribution.organizationsCreated',
  'attribution.connectionsCreated',
  'attribution.campaignsContributedCount',
] as const satisfies readonly MetricId[];
