/**
 * Layer 1 — campaign era + faction trajectory contracts (browser-safe).
 * Advisory pressure layer; does not mutate canon (events, relations, territory).
 * @see docs/architecture-internal/faction-momentum.md
 */
export declare const CAMPAIGN_MOMENTUM_SEMANTICS_VERSION = "campaign-momentum-v1";
export declare const FACTION_MOMENTUM_STATES: readonly ["rising", "stable", "fragmenting", "declining", "dormant", "expanding", "desperate", "resurgent"];
export type FactionMomentumState = (typeof FACTION_MOMENTUM_STATES)[number];
export declare const FACTION_MOMENTUM_STATE_LABELS: Record<FactionMomentumState, string>;
/** States that surface as "rising tension" in world pressure projection. */
export declare const RISING_TENSION_MOMENTUM_STATES: readonly FactionMomentumState[];
/**
 * Engine default for new trajectories — least directional existing state.
 * Not inferred from GM-authored `direction` text.
 */
export declare const DEFAULT_TRAJECTORY_MOMENTUM_STATE: FactionMomentumState;
export declare function organizationWorldStateToMomentum(worldState: string | null | undefined): FactionMomentumState | null;
export declare function resolveFactionTrajectoryForEra(input: {
    eraTrajectories: FactionEraTrajectory[];
    eraId: string;
    worldState: string | null;
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
};
export type FactionEraTrajectory = {
    eraId: string;
    byEraId: string | null;
    direction: string | null;
    outcome: string | null;
    momentumState: FactionMomentumState;
    /** 0–100 internal weighting only; not player-facing. */
    pressure: number | null;
    gmNote: string | null;
    desiredDirection?: 'rising' | 'stable' | 'declining' | null;
    desiredNarrative?: string[] | null;
    allowedCauses?: string[] | null;
    activityLevel?: 'dormant' | 'low' | 'medium' | 'high' | null;
    developmentTypes?: string[] | null;
    isKeyFaction?: boolean | null;
};
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
export declare function normalizeFactionEraTrajectory(raw: unknown): FactionEraTrajectory | null;
export declare function normalizeFactionEraTrajectories(raw: unknown): FactionEraTrajectory[];
//# sourceMappingURL=factionMomentumMetadata.d.ts.map
