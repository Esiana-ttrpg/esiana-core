/**
 * World Development provider contracts — trajectory-driven suggestion pool.
 * @see docs/architecture-internal/world-development.md
 */
import type {
  CampaignEra,
  FactionEraTrajectory,
  FactionMomentumState,
} from './factionMomentumMetadata.js';
import { FACTION_MOMENTUM_STATE_LABELS } from './factionMomentumMetadata.js';
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

/** Stable identity for an explicit org trajectory (no standalone trajectory UUID). */
export type TrajectoryRef = {
  subjectPageId: string;
  fromEraId: string;
};

/**
 * Normalized trajectory slice passed to providers.
 * Authorial fields may be null for worldState fallback rows (`isExplicit: false`).
 */
export type NormalizedTrajectoryContext = {
  subjectPageId: string;
  subjectTitle: string;
  subjectCategory: 'organizations';
  fromEraId: string;
  fromEraName: string;
  byEraId: string | null;
  byEraName: string | null;
  direction: string | null;
  outcome: string | null;
  momentumState: FactionMomentumState;
  momentumLabel: string;
  pressure: number | null;
  activityLevel: FactionActivityLevel;
  gmNote: string | null;
  region: string | null;
  /** Era the resolver evaluated against (usually current). */
  resolvedForEraId: string;
  /** Existing pressure / forecast bullets for this subject. */
  bullets: string[];
  /** True only for explicit eraTrajectories rows (not worldState fallback). */
  isExplicit: boolean;

  /** @deprecated Prefer subjectPageId — compatibility window for plugins. */
  orgPageId: string;
  /** @deprecated Prefer subjectTitle. */
  orgTitle: string;
  /** @deprecated Prefer momentumState. */
  momentum: FactionMomentumState;
  /** @deprecated Prefer resolvedForEraId for evaluated era; From is fromEraId. */
  eraId: string;
};

/** Alias for provider-facing faction slice. */
export type ProjectedFactionState = NormalizedTrajectoryContext;

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

/** What providers return — no providerId (registry stamps it). */
export type ProviderDevelopmentCandidate = {
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
  /** Proposed by provider; registry validates against explicit contexts. */
  trajectoryRef: TrajectoryRef | null;
};

/** After registry — providerId guaranteed and authoritative. */
export type DevelopmentCandidate = ProviderDevelopmentCandidate & {
  providerId: string;
};

export interface DevelopmentProvider {
  id: string;
  developmentDefinitions(): DevelopmentDefinition[];
  generateCandidates(context: WorldDevelopmentContext): ProviderDevelopmentCandidate[];
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

function eraName(eras: CampaignEra[], eraId: string | null | undefined): string {
  if (!eraId) return '';
  return eras.find((era) => era.id === eraId)?.name ?? eraId;
}

export type BuildNormalizedTrajectoryContextInput = {
  subjectPageId: string;
  subjectTitle: string;
  region: string | null;
  trajectory: FactionEraTrajectory;
  resolvedForEraId: string;
  eras: CampaignEra[];
  activityLevel: FactionActivityLevel;
  isExplicit: boolean;
  bullets?: string[];
};

/** Build provider-facing trajectory context with canonical fields + deprecated aliases. */
export function buildNormalizedTrajectoryContext(
  input: BuildNormalizedTrajectoryContextInput,
): NormalizedTrajectoryContext {
  const fromEraId = input.trajectory.eraId;
  const byEraId = input.isExplicit ? input.trajectory.byEraId : null;
  const momentumState = input.trajectory.momentumState;
  const direction = input.isExplicit ? input.trajectory.direction : null;
  const outcome = input.isExplicit ? input.trajectory.outcome : null;
  const gmNote = input.isExplicit ? input.trajectory.gmNote : null;
  const pressure = input.trajectory.pressure;

  return {
    subjectPageId: input.subjectPageId,
    subjectTitle: input.subjectTitle,
    subjectCategory: 'organizations',
    fromEraId,
    fromEraName: eraName(input.eras, fromEraId) || fromEraId,
    byEraId,
    byEraName: byEraId ? eraName(input.eras, byEraId) || byEraId : null,
    direction,
    outcome,
    momentumState,
    momentumLabel: FACTION_MOMENTUM_STATE_LABELS[momentumState],
    pressure,
    activityLevel: input.activityLevel,
    gmNote,
    region: input.region,
    resolvedForEraId: input.resolvedForEraId,
    bullets: input.bullets ?? [],
    isExplicit: input.isExplicit,
    orgPageId: input.subjectPageId,
    orgTitle: input.subjectTitle,
    momentum: momentumState,
    eraId: input.resolvedForEraId,
  };
}

/** Accept trajectoryRef only when it matches an explicit projected state. */
export function validateTrajectoryRef(
  ref: TrajectoryRef | null | undefined,
  projectedFactionStates: readonly ProjectedFactionState[],
): TrajectoryRef | null {
  if (!ref?.subjectPageId || !ref.fromEraId) return null;
  const match = projectedFactionStates.find(
    (state) =>
      state.isExplicit &&
      state.subjectPageId === ref.subjectPageId &&
      state.fromEraId === ref.fromEraId,
  );
  return match ? { subjectPageId: ref.subjectPageId, fromEraId: ref.fromEraId } : null;
}
