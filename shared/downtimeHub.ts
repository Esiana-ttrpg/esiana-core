/**
 * Downtime hub — section routing + presentation payloads (browser-safe).
 * Views consume these types only; chronology overlay shapes stay in the adapter.
 */
import type {
  DowntimeHavenSummary,
  HavenCrewEntry,
  HavenReferenceType,
  HavenThreatSeverity,
} from './havenMetadata.js';
import type { HavenSimulationSnapshot } from './havenSimulation.js';
import type { DowntimeProjectSummary } from './projectMetadata.js';
import type {
  ProjectBlockerEntry,
  ProjectOutcomeEntry,
  ProjectResourceEntry,
} from './projectMetadata.js';
import type { LedgerEntryKind, LedgerCategory } from './ledgerMetadata.js';
import type { WorldPressureProjection } from './worldPressureProjection.js';

export type { HavenSimulationSnapshot } from './havenSimulation.js';

export const DOWNTIME_HUB_TITLE = 'Downtime';

export const DOWNTIME_SECTIONS = [
  { id: 'projects', label: 'Projects' },
  { id: 'havens', label: 'Havens' },
  { id: 'worldEvents', label: 'World Events' },
  { id: 'reputation', label: 'Reputation' },
  { id: 'ledger', label: 'Ledger' },
] as const;

export type DowntimeSectionId = (typeof DOWNTIME_SECTIONS)[number]['id'];

export type DowntimeFeedCardTone = 'neutral' | 'warning' | 'escalation';

export type DowntimeFeedCardSourceType =
  | 'creative_drift'
  | 'event_consequence'
  | 'quest_time'
  | 'continuity_diagnostic'
  | 'haven_threat'
  | 'project_pressure';

export type DowntimeFeedCardPriority = 'critical' | 'actionable' | 'important' | 'ambient';

export type DowntimeFeedCard = {
  id: string;
  title: string;
  summary: string;
  dateLabel: string;
  tone?: DowntimeFeedCardTone;
  href?: string;
  sourceType?: DowntimeFeedCardSourceType;
  priority?: DowntimeFeedCardPriority;
  /** Campaign epoch minute for pressure feed sort (newest / most urgent first). */
  detectedAtEpochMinute?: string;
  /** Relative campaign-time label for narrative feeds ("3 days ago"). */
  relativeDateLabel?: string;
  /** Fantasy calendar date for tooltip / secondary display. */
  calendarDateLabel?: string;
  /** Primary prose line for chronicle-style feeds. */
  narrative?: string;
};

export type DowntimePressureCounts = {
  continuityPressureCount: number;
  havenThreatCount: number;
  stalledProjectCount: number;
  actionableCount: number;
};

export type DowntimePressurePresentation = {
  cards: DowntimeFeedCard[];
  counts: DowntimePressureCounts;
};

export type DowntimePulse = {
  headline: string;
  bullets: string[];
};

export type DowntimeCurrentPeriod = {
  title: string;
  spanLabel: string | null;
  rollupHeadline: string;
  isOpen: boolean;
  advanceRunCount: number;
  projectCompletions: number;
  projectFailures: number;
  chronologyFeedHref: string;
};

export type DowntimeSimulationSnapshot = {
  currentTimeLabel: string;
  elapsedSinceLabel: string | null;
  currentDowntimePeriod: DowntimeCurrentPeriod | null;
  pulse: DowntimePulse;
  recentWorldActivity: DowntimeFeedCard[];
  recentConsequences: DowntimeFeedCard[];
  activeOperationsSummary: {
    projects: { count: number; status: 'planned' | 'active' | 'empty' };
    havens: { count: number; status: 'planned' | 'active' | 'empty' };
  };
  creativeDriftActiveCount: number | null;
  continuityPressureCount: number | null;
  havenThreatCount: number | null;
  stalledProjectCount: number | null;
  factionPressureHint: string | null;
  /** GM/Writer only — advisory world pressure projection. */
  worldPressure?: WorldPressureProjection | null;
};

export type DowntimePlaceholderFraming = {
  headline: string;
  body: string[];
  phase: number;
};

export type DowntimeHubOverviewPayload = {
  simulationSnapshot: DowntimeSimulationSnapshot;
};

export type WorldEventSuggestionLine = {
  id: string;
  kind: 'faction_pressure' | 'era_trend';
  kindLabel: string;
  title: string;
  narrative: string | null;
  orgTitle: string | null;
  orgHref: string | null;
  momentumLabel: string | null;
  canResolve: boolean;
  acceptedEventHref?: string | null;
};

export type DowntimeHubWorldEventsPayload = {
  feed: DowntimeFeedCard[];
  chronologyHref: string;
  pendingConsequenceCount?: number;
  pendingSuggestions?: WorldEventSuggestionLine[];
  pendingSuggestionsCount?: number;
};

export type DowntimeHubPlaceholderPayload = {
  status: 'planned';
  phase: number;
  framing: DowntimePlaceholderFraming;
};

export type LedgerTransactionLine = {
  id: string;
  title: string;
  amountLabel: string;
  narrative?: string | null;
  dateLabel: string;
  category: LedgerCategory;
  categoryLabel: string;
  tone?: DowntimeFeedCardTone;
  href?: string;
  entryKind: LedgerEntryKind;
  amount: number;
  projectId?: string | null;
  havenWikiPageId?: string | null;
  contributorPageId?: string | null;
  contributorTitle?: string | null;
  canEdit: boolean;
  canDelete: boolean;
};

export type LedgerSuggestionLine = {
  id: string;
  title: string;
  amountLabel: string | null;
  narrative?: string | null;
  category: LedgerCategory;
  categoryLabel: string;
  entryKind: LedgerEntryKind;
  amount: number | null;
  confidence: 'inferred' | 'authored';
  sourceType: string;
  projectId?: string | null;
  havenWikiPageId?: string | null;
  projectHref?: string | null;
  havenHref?: string | null;
  canResolve: boolean;
};

export type ScheduledTreasuryScheduleLine = {
  id: string;
  title: string;
  effectKind: 'ledger_upkeep' | 'ledger_income';
  status: 'active' | 'paused' | 'archived';
  amount: number | null;
  recurrenceLabel: string;
  nextFireLabel: string | null;
  havenTitle: string | null;
  havenHref: string | null;
  canManage: boolean;
};

export type DowntimeHubLedgerPayload = {
  treasury: {
    balance: number;
    balanceLabel: string;
    currencyLabel: string;
    currencySuffix: string;
    openingBalance: number;
    sharedTreasuryEnabled: boolean;
    openDebtsSummary: string | null;
  };
  feed: LedgerTransactionLine[];
  pendingSuggestions: LedgerSuggestionLine[];
  pendingSuggestionsCount: number;
  scheduledTreasury: ScheduledTreasuryScheduleLine[];
  scheduledTreasuryActiveCount: number;
  framing: DowntimePlaceholderFraming;
};

export type ReputationStandingCard = {
  factionPageId: string;
  factionTitle: string;
  factionHref: string;
  trustBand: string;
  notorietyBand: string;
  trustTone: DowntimeFeedCardTone;
  notorietyTone: DowntimeFeedCardTone;
};

export type ReputationFeedLine = {
  id: string;
  factionTitle: string;
  factionHref: string;
  direction: 'up' | 'down' | 'flat';
  directionArrow: string;
  bandLabel: string;
  axis: 'trust' | 'notoriety';
  narrative: string;
  dateLabel: string;
  tone?: DowntimeFeedCardTone;
};

export type ReputationSuggestionLine = {
  id: string;
  kind: 'band_crossing' | 'investigation' | 'rumor_spread';
  factionTitle: string;
  factionHref: string;
  axis: 'trust' | 'notoriety';
  direction: 'up' | 'down' | 'flat';
  directionArrow: string;
  fromBand: string | null;
  toBand: string | null;
  title: string;
  narrative: string | null;
  projectHref: string | null;
  havenHref: string | null;
  canResolve: boolean;
};

export type DowntimeHubReputationPayload = {
  standings: ReputationStandingCard[];
  feed: ReputationFeedLine[];
  pendingSuggestions: ReputationSuggestionLine[];
  pendingSuggestionsCount: number;
  framing: DowntimePlaceholderFraming;
};

export type DowntimeHubProjectsPayload = {
  cards: DowntimeProjectOperationCard[];
  framing: DowntimePlaceholderFraming;
};

export type DowntimeHavenSituationCard = DowntimeHavenSummary & {
  subtitle: string;
  recentActivity: string[];
  escalatingThreats: string[];
  presentLabels: string[];
  lastActiveLabel: string | null;
  pressureHeadline: string | null;
};

export type HavenReferenceOpensIn = 'wiki' | 'maps' | 'external' | 'chronology';

export type DowntimeHavenOverviewReference = {
  id: string;
  type: HavenReferenceType;
  title: string;
  href: string;
  previewImageUrl: string | null;
  excerpt: string | null;
  opensIn: HavenReferenceOpensIn;
};

export type DowntimeHavenOverviewIdentity = {
  bannerUrl: string | null;
  portraitUrl: string | null;
  crestUrl: string | null;
  galleryUrls: string[];
  summary: string | null;
  locationLabel: string | null;
  locationHref: string | null;
  factions: Array<{ pageId: string; label: string; href: string }>;
  relatedPages: Array<{ pageId: string; label: string; href: string }>;
};

export type DowntimeHavenOverviewSpace = {
  id: string;
  label: string;
  description: string | null;
};

export type DowntimeHavenOverviewPayload = {
  havenId: string;
  wikiPageId: string;
  title: string;
  identity: DowntimeHavenOverviewIdentity;
  pulse: DowntimePulse;
  simulation: HavenSimulationSnapshot;
  recentChanges: DowntimeFeedCard[];
  references: DowntimeHavenOverviewReference[];
  spaces: DowntimeHavenOverviewSpace[];
  activeOperations: DowntimeProjectOperationCard[];
  threats: Array<{
    id: string;
    label: string;
    severity: HavenThreatSeverity | null;
    description: string | null;
    tone: DowntimeFeedCardTone;
  }>;
  improvements: Array<{
    id: string;
    label: string;
    description: string | null;
    provenanceLabel: string | null;
  }>;
  present: {
    residents: Array<{ pageId: string; label: string }>;
    crew: HavenCrewEntry[];
  };
  loreMarkdown: string | null;
};

export type DowntimeHubHavensPayload = {
  cards: DowntimeHavenSituationCard[];
  framing: DowntimePlaceholderFraming;
};

export type ProjectClockState =
  | 'running'
  | 'waiting'
  | 'paused'
  | 'complete'
  | 'failed';

export type DowntimeProjectOperationCard = DowntimeProjectSummary & {
  remainingLabel: string | null;
  stalledLabel: string | null;
  requiresSummary: string | null;
  blockersSummary: string | null;
  clockState: ProjectClockState;
  /** Narrative posture from wiki metadata — not simulation status. */
  operationPostureLabel: string | null;
};

export type DowntimeProjectOverviewLink = {
  pageId: string;
  label: string;
  href: string;
};

export type DowntimeProjectOverviewPayload = {
  projectId: string;
  wikiPageId: string;
  title: string;
  operation: DowntimeProjectOperationCard;
  resources: ProjectResourceEntry[];
  blockers: ProjectBlockerEntry[];
  outcomes: ProjectOutcomeEntry[];
  owner: DowntimeProjectOverviewLink | null;
  haven: DowntimeProjectOverviewLink | null;
  loreMarkdown: string | null;
  recentChanges: DowntimeFeedCard[];
  pendingTreasurySuggestions?: LedgerSuggestionLine[];
};

export type DowntimeHubPayload = {
  category: {
    id: string;
    title: string;
    parentId: string | null;
    visibility: string;
    updatedAt: string;
    systemCategoryKey?: string | null;
  };
  activeSection: DowntimeSectionId | null;
  overview?: DowntimeHubOverviewPayload;
  worldEvents?: DowntimeHubWorldEventsPayload;
  projects?: DowntimeHubProjectsPayload;
  havens?: DowntimeHubHavensPayload;
  reputation?: DowntimeHubReputationPayload;
  ledger?: DowntimeHubLedgerPayload;
};

export function normalizeDowntimeSection(raw: unknown): DowntimeSectionId | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.toLowerCase() === 'worldevents') return 'worldEvents';
  const lower = trimmed.toLowerCase();
  const match = DOWNTIME_SECTIONS.find((section) => section.id.toLowerCase() === lower);
  return match?.id ?? null;
}

export const DOWNTIME_PLACEHOLDER_FRAMING: Record<
  Exclude<DowntimeSectionId, 'worldEvents'>,
  DowntimePlaceholderFraming
> = {
  projects: {
    headline: 'No active projects.',
    body: [
      'Long-term operations, research, repairs, construction, and faction initiatives will appear here.',
      'Projects advance when time passes — not when you check a task board.',
    ],
    phase: 2,
  },
  havens: {
    headline: 'No havens registered yet.',
    body: [
      'Operational bases — ships, strongholds, sanctuaries, and crew quarters — will take shape here.',
      'Each haven will carry its own rhythm of activity, threat, and upkeep.',
    ],
    phase: 3,
  },
  reputation: {
    headline: 'Reputation shifts quietly.',
    body: [
      'Faction trust, notoriety, and rumor will surface here as the world reacts to your choices.',
      'Consequences accumulate between sessions — often before anyone notices.',
    ],
    phase: 5,
  },
  ledger: {
    headline: 'The treasury awaits its first ledger.',
    body: [
      'Major income, expenses, debts, and project costs will appear as narrative line items — not a spreadsheet.',
      'Shared party funds and upkeep will live here when the campaign needs them.',
    ],
    phase: 4,
  },
};
