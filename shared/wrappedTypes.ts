import type { MetricId } from './metricRegistry.js';
import type { MetricValue } from './metricValue.js';
import type { PersonalArchetypeId } from './statsTypes.js';

/** Calculation schema version stored on UserWrappedSnapshot. */
export const WRAPPED_SCHEMA_VERSION = 1 as const;

/** Writing instrumentation reliability floor (UTC civil month). */
export const WRAPPED_WRITING_RELIABLE_FROM = '2026-11-01' as const;

export type WrappedEdition = 'preview' | 'completed';

export type WrappedCoverageStatus =
  | 'measured'
  | 'partial'
  | 'reconstructed'
  | 'not_yet_tracked'
  | 'unavailable';

export type WrappedMetricFamily =
  | 'writing'
  | 'worldbuilding'
  | 'cartography'
  | 'chronology'
  | 'participation'
  | 'campaigns'
  | 'sharedAttendance'
  | 'comparative';

export type WrappedCoverageIndicator = {
  family: WrappedMetricFamily;
  status: WrappedCoverageStatus;
  /** Optional human-facing note key or short English note for docs/tests. */
  note?: string;
};

export type WrappedAttributionScope =
  | 'personal'
  | 'campaign'
  | 'shared'
  | 'comparative';

export type WrappedSlideId =
  | 'year-intro'
  | 'worlds-explored'
  | 'adventure-log'
  | 'creative-legacy'
  | 'top-campaign'
  | 'writing-rhythm'
  | 'world-you-helped-build'
  | 'biggest-month'
  | 'fellow-adventurers'
  | 'year-compared'
  | 'signature-achievement'
  | 'year-summary';

export type WrappedEditionTier = 'full' | 'short' | 'unavailable';

export type WrappedTopCampaignSelectionReason = {
  campaignId: string;
  activeDays: number;
  contributions: number;
  pagesTouched: number;
  /** Lexicographic: activeDays → contributions → name (existing active-campaign contract). */
  ranking: 'active_campaigns_v1';
};

/**
 * Durable calculation payload — no campaign titles or artwork URLs.
 * Presentation is resolved on every read against current authorization.
 */
export type WrappedCalculationV1 = {
  schemaVersion: typeof WRAPPED_SCHEMA_VERSION;
  year: number;
  timeZone: string;
  generatedAt: string;
  edition: WrappedEdition;
  slideIds: WrappedSlideId[];
  editionTier: WrappedEditionTier;
  coverage: WrappedCoverageIndicator[];
  /**
   * When writing (or other) coverage is partial for the calendar year,
   * disclose the reliable-from bound (ISO date YYYY-MM-DD).
   */
  coverageDisclosure: {
    writingReliableFrom: string | null;
    isPartialYearWriting: boolean;
  };
  metrics: {
    personal: Partial<Record<MetricId, MetricValue>>;
    /** Campaign-scoped personal activity keyed by campaign id. */
    byCampaign: Record<
      string,
      {
        activeDays: number;
        contributions: number;
        pagesTouched: number;
      }
    >;
    /** Period participation totals from Personal Statistics domains (not MetricIds). */
    participation: {
      sessionsAttended: MetricValue;
      sessionsHosted: MetricValue;
      campaignsParticipated: MetricValue;
    };
    shared: {
      /** Distinct other attendees co-present in completed sessions the user attended. */
      fellowAdventurerCount: MetricValue;
      sessionsWithOthers: MetricValue;
    };
    comparative: {
      previousYear: number | null;
      previousEligible: boolean;
      deltas: Partial<Record<MetricId, MetricValue>>;
    };
  };
  topCampaign: WrappedTopCampaignSelectionReason | null;
  /** Campaign ids referenced by slides / metrics (for re-authorization). */
  referencedCampaignIds: string[];
  archetypes: {
    dominantId: PersonalArchetypeId | null;
    scores: Array<{ id: PersonalArchetypeId; score: number | null }>;
  } | null;
  /** Peak calendar month (1–12) by active contribution days, when known. */
  biggestMonth: { month: number; activeDays: number; contributions: number } | null;
  monthlyActivity: Array<{ month: number; activeDays: number; contributions: number }>;
};

export type WrappedCampaignPresentation = {
  id: string;
  name: string;
  handle: string;
  href: string;
  coverImageUrl: string | null;
  /** False when the viewer no longer has access; aggregates may be redacted. */
  authorized: boolean;
};

/**
 * API response: frozen calculation + freshly authorized presentation.
 * Campaign-scoped values for unauthorized campaigns are omitted or unavailable.
 */
export type WrappedPublicationStatus = {
  status: 'unpublished' | 'published';
  publishedAt: string | null;
  /** False when the instance disables public Wrapped publishing. */
  publicPublishingEnabled: boolean;
};

export type WrappedYearResponse = {
  version: 1;
  year: number;
  edition: WrappedEdition;
  timeZone: string;
  generatedAt: string;
  regeneratedAt: string | null;
  /** Owner private read vs frozen public presentation. */
  access: 'owner' | 'public';
  owner?: {
    id: string;
    displayName: string;
  };
  calculation: WrappedCalculationV1;
  presentation: {
    campaigns: Record<string, WrappedCampaignPresentation>;
    /**
     * After re-authorization, campaign-scoped ranking/metrics may drop campaigns
     * the user can no longer access. Aggregates that would disclose private
     * activity are remapped to unavailable.
     */
    redactedCampaignIds: string[];
  };
  slideManifest: WrappedSlideManifestEntry[];
  publication: WrappedPublicationStatus;
};

/** Frozen body stored on UserWrappedSnapshot.publishedPayload. */
export type WrappedPublishedPayloadV1 = {
  schemaVersion: 1;
  calculation: WrappedCalculationV1;
  presentation: WrappedYearResponse['presentation'];
};

export type WrappedInviteAvailability = 'ready' | 'limited' | 'unavailable';

export type WrappedSlideManifestEntry = {
  id: WrappedSlideId;
  scope: WrappedAttributionScope;
  visualization: string;
  narrativeKey: string;
  sharePolicy: 'owner_only' | 'share_safe_allowlist' | 'never_export';
};

export type WrappedYearSummary = {
  year: number;
  eligible: boolean;
  editionTier: WrappedEditionTier;
  edition: WrappedEdition;
  coverageDisclosure: WrappedCalculationV1['coverageDisclosure'];
  reasons: string[];
};

export type WrappedYearsResponse = {
  version: 1;
  timeZone: string;
  years: WrappedYearSummary[];
};

export type WrappedFinalCardPreset = 'adventurer' | 'worldbuilder' | 'storyteller';

/** Fields permitted on the PNG export surface (Pass 3). */
export const WRAPPED_SHARE_SAFE_FIELD_IDS = [
  'year',
  'preset',
  'personal.period.wordsAdded',
  'personal.period.pagesCreated',
  'personal.period.pagesEdited',
  'participation.sessionsAttended',
  'participation.sessionsHosted',
  'participation.campaignsParticipated',
  'archetype.dominantId',
  'coverageDisclosure',
] as const;

export type WrappedShareSafeFieldId = (typeof WRAPPED_SHARE_SAFE_FIELD_IDS)[number];
