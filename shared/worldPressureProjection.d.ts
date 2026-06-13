/**
 * Pure world pressure projection from era trajectories (no DB, advisory only).
 */
import type { CampaignEra, FactionEraTrajectory, FactionMomentumState } from './factionMomentumMetadata.js';
export type FactionPressureInput = {
    orgPageId: string;
    orgTitle: string;
    trajectory: FactionEraTrajectory | null;
    currentPressures: string[];
    worldState: string | null;
    hostileRelationCount: number;
    region: string | null;
};
export type FactionPressureLine = {
    orgPageId: string;
    orgTitle: string;
    currentEraId: string;
    momentumState: FactionMomentumState | null;
    momentumLabel: string;
    pressure: number | null;
    bullets: string[];
};
export type WorldPressureProjection = {
    currentEra: CampaignEra;
    risingTensions: FactionPressureLine[];
    eraTrends: string[];
    nearFutureBullets: string[];
    projectedByNextSession: {
        daysUntil: number;
        bullets: string[];
    } | null;
};
export declare function buildFactionPressureLine(currentEraId: string, input: FactionPressureInput): FactionPressureLine | null;
export declare function buildWorldPressureProjection(input: {
    currentEra: CampaignEra;
    factions: FactionPressureInput[];
    daysUntilNextSession?: number | null;
}): WorldPressureProjection;
export declare function pickFactionPressureHint(projection: WorldPressureProjection): string | null;
//# sourceMappingURL=worldPressureProjection.d.ts.map