/**
 * World Development provider contracts — trajectory-driven suggestion pool.
 * @see docs/architecture-internal/world-development.md
 */
import type { CampaignEra, FactionMomentumState } from './factionMomentumMetadata.js';
import type { AdvanceMagnitude } from './globalTimeHooks.js';
import type { TrendDirection } from './worldEventSuggestionMetadata.js';
import type { WorldPressureProjection } from './worldPressureProjection.js';
import type {
  DevelopmentAcceptTarget,
  DevelopmentRationaleLine,
  DevelopmentType,
  FactionActivityLevel,
  WorldDevelopmentSettings,
} from './worldDevelopmentMetadata.js';
import type { DevelopmentDefinition } from './coreDevelopmentDefinitions.js';

/** Per-faction signal slice — core builds this; providers consume it. */
export type ProjectedFactionState = {
  orgPageId: string;
  orgTitle: string;
  momentum: FactionMomentumState;
  momentumLabel: string;
  activityLevel: FactionActivityLevel;
  pressure: number | null;
  region: string | null;
  eraId: string;
  bullets: string[];
};

export type WorldDevelopmentContext = {
  campaignId: string;
  projectedFactionStates: ProjectedFactionState[];
  currentEra: CampaignEra;
  settings: WorldDevelopmentSettings;
  advanceMagnitude: AdvanceMagnitude;
  nextEpochMinute: string;
  batchId?: string;
  projection?: WorldPressureProjection;
};

export type DevelopmentCandidate = {
  definitionId: string;
  developmentType: DevelopmentType;
  title: string;
  narrative: string | null;
  rationale: DevelopmentRationaleLine[];
  idempotencyKey: string;
  primaryOrgPageId: string | null;
  eraId: string | null;
  momentumState: FactionMomentumState | null;
  trendDirection: TrendDirection | null;
  proposedAcceptTarget: DevelopmentAcceptTarget;
  /** DB suggestion kind — org-scoped vs regional. */
  suggestionKind: 'faction_pressure' | 'era_trend';
};

export interface DevelopmentProvider {
  id: string;
  developmentDefinitions(): DevelopmentDefinition[];
  generateCandidates(context: WorldDevelopmentContext): DevelopmentCandidate[];
}

export type EligibilityContext = {
  campaignId: string;
  definitionId: string;
  candidate: DevelopmentCandidate;
  faction: ProjectedFactionState | null;
};

export interface EligibilityProvider {
  definitionId: string;
  isEligible(context: EligibilityContext): boolean | Promise<boolean>;
}

export type RationaleContext = {
  campaignId: string;
  definitionId: string;
  candidate: DevelopmentCandidate;
  faction: ProjectedFactionState | null;
  baseRationale: DevelopmentRationaleLine[];
};

export interface RationaleProvider {
  definitionId: string;
  appendRationale(context: RationaleContext): DevelopmentRationaleLine[];
}

export type ResolveDevelopmentContext = {
  campaignId: string;
  campaignHandle: string;
  suggestionId: string;
  definitionId: string;
  developmentType: DevelopmentType;
  title: string;
  narrative: string | null;
  acceptTarget: DevelopmentAcceptTarget;
  userId: string;
};

export type ResolveDevelopmentResult = {
  resultSummary: string;
  acceptedArtifactId?: string | null;
  calendarEventId?: string | null;
  lorePageId?: string | null;
};

export interface DevelopmentResolveProvider {
  definitionId: string;
  resolveDevelopment(context: ResolveDevelopmentContext): Promise<ResolveDevelopmentResult>;
}
