/**
 * Layer 1 — campaign era + faction trajectory contracts (browser-safe).
 * Advisory pressure layer; does not mutate canon (events, relations, territory).
 * @see docs/architecture-internal/faction-momentum.md
 * @see docs/architecture-internal/world-development.md
 */
import type { WorldDevelopmentSettings } from './worldDevelopmentMetadata.js';
export declare const CAMPAIGN_MOMENTUM_SEMANTICS_VERSION = "campaign-momentum-v1";
export declare const FACTION_MOMENTUM_STATES: readonly ["rising", "stable", "fragmenting", "declining", "dormant", "expanding", "desperate", "resurgent"];
export type FactionMomentumState = (typeof FACTION_MOMENTUM_STATES)[number];
export declare const FACTION_MOMENTUM_STATE_LABELS: Record<FactionMomentumState, string>;
/** States that surface as "rising tension" in world pressure projection. */
export declare const RISING_TENSION_MOMENTUM_STATES: readonly FactionMomentumState[];
export declare function organizationWorldStateToMomentum(worldState: string | null | undefined): FactionMomentumState | null;
/**
 * Engine default for new trajectories — least directional existing state.
 * Not inferred from GM-authored `direction` text.
 */
export declare const DEFAULT_TRAJECTORY_MOMENTUM_STATE: FactionMomentumState;
/** Shared planning fields for Organizations · Characters · Locations. */
export type EraTrajectory = {
    /** From — era when this direction begins/applies. */
    eraId: string;
    /** Optional inclusive upper bound; null = open-ended from From onward. */
    byEraId: string | null;
    /** GM-authored freeform direction. */
    direction: string | null;
    /** GM-authored intended outcome. */
    outcome: string | null;
    gmNote: string | null;
};
/**
 * Explicit From/By resolution for any subject — no world-state fallback.
 * Characters and Locations use this path only.
 */
export declare function resolveExplicitTrajectoryForEra<T extends Pick<EraTrajectory, 'eraId' | 'byEraId'>>(input: {
    eraTrajectories: T[];
    eraId: string;
    /** When provided, From/By matching uses era sortOrder (By null = open-ended). */
    eras?: CampaignEra[];
}): T | null;
/**
 * Prefer explicit era trajectory (From/By range when eras provided);
 * fall back to organization world state for the target era.
 * Organization-only compatibility path — do not use for Characters/Locations.
 */
export declare function resolveFactionTrajectoryForEra(input: {
    eraTrajectories: FactionEraTrajectory[];
    eraId: string;
    worldState: string | null;
    /** When provided, From/By matching uses era sortOrder (By null = open-ended). */
    eras?: CampaignEra[];
}): FactionEraTrajectory | null;
export type CampaignEra = {
    id: string;
    name: string;
    sortOrder: number;
    isCurrent: boolean;
    epochStartMinute: string | null;
    epochEndMinute: string | null;
    narrativeNote: string | null;
};
export type CampaignMomentumState = {
    version: typeof CAMPAIGN_MOMENTUM_SEMANTICS_VERSION;
    eras: CampaignEra[];
    worldPressurePaused?: boolean;
    worldDevelopment?: WorldDevelopmentSettings;
};
/** Organization trajectory = shared planning fields + faction engine state. */
export type FactionEraTrajectory = EraTrajectory & {
    /** Engine development signal — not semantic direction text. */
    momentumState: FactionMomentumState;
    /** 0–100 internal weighting only; not player-facing. */
    pressure: number | null;
    desiredDirection?: 'rising' | 'stable' | 'declining' | null;
    desiredNarrative?: string[] | null;
    allowedCauses?: string[] | null;
    activityLevel?: 'dormant' | 'low' | 'medium' | 'high' | null;
    developmentTypes?: string[] | null;
    isKeyFaction?: boolean | null;
};
/** Create a planning-only trajectory (Characters / Locations). */
export declare function createEraTrajectory(patch: Partial<EraTrajectory> & Pick<EraTrajectory, 'eraId'>): EraTrajectory;
export declare function createFactionEraTrajectory(patch: Partial<FactionEraTrajectory> & Pick<FactionEraTrajectory, 'eraId'>): FactionEraTrajectory;
export declare const DEFAULT_PRESENT_ERA_ID = "era-present";
export declare function createDefaultPresentEra(): CampaignEra;
export declare function createDefaultCampaignMomentumState(): CampaignMomentumState;
export declare function normalizeCampaignEra(raw: unknown, index: number): CampaignEra | null;
export declare function parseCampaignMomentumState(raw: unknown): CampaignMomentumState;
export declare function serializeCampaignMomentumState(state: CampaignMomentumState): Record<string, unknown>;
export declare function getCurrentCampaignEra(state: CampaignMomentumState): CampaignEra;
/** Resolve which authored era applies at a target epoch (bounds-based; falls back to current). */
export declare function resolveCampaignEraAtEpoch(state: CampaignMomentumState, targetEpochMinute: string): CampaignEra;
/** Normalize shared planning fields (Characters / Locations). Requires eraId only. */
export declare function normalizeEraTrajectory(raw: unknown): EraTrajectory | null;
export declare function normalizeEraTrajectories(raw: unknown): EraTrajectory[];
export declare function normalizeFactionEraTrajectory(raw: unknown): FactionEraTrajectory | null;
export declare function normalizeFactionEraTrajectories(raw: unknown): FactionEraTrajectory[];
//# sourceMappingURL=factionMomentumMetadata.d.ts.map