/**
 * World Development provider contracts — trajectory-driven suggestion pool.
 * Supports Organizations · Characters · Locations as explicit trajectory subjects.
 * @see docs/architecture-internal/world-development.md
 */
import type {
  CampaignEra,
  EraTrajectory,
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

/** Stable identity for an explicit trajectory (no standalone trajectory UUID). */
export type TrajectoryRef = {
  subjectPageId: string;
  fromEraId: string;
};

export type TrajectorySubjectCategory = 'organizations' | 'characters' | 'locations';

/** Organization-only faction engine slice. */
export type OrganizationTrajectoryEngineState = {
  momentumState: FactionMomentumState;
  momentumLabel: string;
  pressure: number | null;
  activityLevel: FactionActivityLevel;
  region: string | null;
};

/**
 * Normalized trajectory slice passed to providers.
 * Authorial fields may be null for worldState fallback rows (`isExplicit: false`).
 * Generic planning intent is always available; organizationState only when the
 * subject is an Organization with faction engine state.
 */
export type NormalizedTrajectoryContext = {
  subjectPageId: string;
  subjectTitle: string;
  subjectCategory: TrajectorySubjectCategory;
  fromEraId: string;
  fromEraName: string;
  byEraId: string | null;
  byEraName: string | null;
  direction: string | null;
  outcome: string | null;
  gmNote: string | null;
  /** Era the resolver evaluated against (usually current). */
  resolvedForEraId: string;
  /** Existing pressure / forecast bullets for this subject. */
  bullets: string[];
  /** True only for explicit eraTrajectories rows (not worldState fallback). */
  isExplicit: boolean;
  /** Present only for organization subjects (explicit or worldState fallback). */
  organizationState?: OrganizationTrajectoryEngineState;

  /**
   * @deprecated Prefer organizationState — flat aliases for plugin compatibility.
   * For non-org subjects these are neutral defaults (stable / null / medium).
   */
  momentumState: FactionMomentumState;
  /** @deprecated Prefer organizationState.momentumLabel. */
  momentumLabel: string;
  /** @deprecated Prefer organizationState.pressure. */
  pressure: number | null;
  /** @deprecated Prefer organizationState.activityLevel. */
  activityLevel: FactionActivityLevel;
  /** @deprecated Prefer organizationState.region. */
  region: string | null;

  /** @deprecated Prefer subjectPageId — compatibility window for plugins. */
  orgPageId: string;
  /** @deprecated Prefer subjectTitle. */
  orgTitle: string;
  /** @deprecated Prefer momentumState / organizationState. */
  momentum: FactionMomentumState;
  /** @deprecated Prefer resolvedForEraId for evaluated era; From is fromEraId. */
  eraId: string;
};

/** Alias for provider-facing projected trajectory slice (all subject categories). */
export type ProjectedFactionState = NormalizedTrajectoryContext;

export type WorldDevelopmentContext = {
  campaignId: string;
  /**
   * Projected trajectory contexts for all supported subjects
   * (Organizations · Characters · Locations). Name retained for plugin compatibility.
   */
  projectedFactionStates: ProjectedFactionState[];
  currentEra: CampaignEra;
  settings: WorldDevelopmentSettings;
  advanceMagnitude: AdvanceMagnitude;
  nextEpochMinute: string;
  batchId?: string;
  projection?: WorldPressureProjection;
};

/**
 * What providers return — no providerId (registry stamps it).
 *
 * Legacy storage names (temporary — not org-only):
 * - `primaryOrgPageId` may hold any subject page id (Character / Location / Organization).
 * - `suggestionKind: 'faction_pressure'` means subject-scoped (vs regional era_trend).
 */
export type ProviderDevelopmentCandidate = {
  definitionId: string;
  developmentType: DevelopmentType;
  title: string;
  narrative: string | null;
  rationale: DevelopmentRationaleLine[];
  idempotencyKey: string;
  /** Legacy name — generic subject page id when set. */
  primaryOrgPageId: string | null;
  eraId: string | null;
  momentumState: FactionMomentumState | null;
  trendDirection: TrendDirection | null;
  proposedAcceptTarget: DevelopmentAcceptTarget;
  /**
   * Legacy DB suggestion kind — `faction_pressure` = subject-scoped;
   * `era_trend` = regional. Not organization-exclusive.
   */
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
  subjectCategory: TrajectorySubjectCategory;
  region: string | null;
  /** Planning fields; organizations also carry momentumState / pressure. */
  trajectory: EraTrajectory | FactionEraTrajectory;
  resolvedForEraId: string;
  eras: CampaignEra[];
  activityLevel: FactionActivityLevel;
  isExplicit: boolean;
  bullets?: string[];
};

function isFactionTrajectory(
  trajectory: EraTrajectory | FactionEraTrajectory,
): trajectory is FactionEraTrajectory {
  return (
    'momentumState' in trajectory &&
    typeof (trajectory as FactionEraTrajectory).momentumState === 'string'
  );
}

/** Build provider-facing trajectory context with canonical fields + deprecated aliases. */
export function buildNormalizedTrajectoryContext(
  input: BuildNormalizedTrajectoryContextInput,
): NormalizedTrajectoryContext {
  const fromEraId = input.trajectory.eraId;
  const byEraId = input.isExplicit ? input.trajectory.byEraId : null;
  const direction = input.isExplicit ? input.trajectory.direction : null;
  const outcome = input.isExplicit ? input.trajectory.outcome : null;
  const gmNote = input.isExplicit ? input.trajectory.gmNote : null;

  const isOrg = input.subjectCategory === 'organizations';
  const momentumState: FactionMomentumState =
    isOrg && isFactionTrajectory(input.trajectory)
      ? input.trajectory.momentumState
      : 'stable';
  const pressure =
    isOrg && isFactionTrajectory(input.trajectory) ? input.trajectory.pressure : null;
  const momentumLabel = FACTION_MOMENTUM_STATE_LABELS[momentumState];

  const organizationState: OrganizationTrajectoryEngineState | undefined = isOrg
    ? {
        momentumState,
        momentumLabel,
        pressure,
        activityLevel: input.activityLevel,
        region: input.region,
      }
    : undefined;

  return {
    subjectPageId: input.subjectPageId,
    subjectTitle: input.subjectTitle,
    subjectCategory: input.subjectCategory,
    fromEraId,
    fromEraName: eraName(input.eras, fromEraId) || fromEraId,
    byEraId,
    byEraName: byEraId ? eraName(input.eras, byEraId) || byEraId : null,
    direction,
    outcome,
    gmNote,
    resolvedForEraId: input.resolvedForEraId,
    bullets: input.bullets ?? [],
    isExplicit: input.isExplicit,
    organizationState,
    momentumState,
    momentumLabel,
    pressure,
    activityLevel: input.activityLevel,
    region: input.region,
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
