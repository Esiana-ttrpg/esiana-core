/**
 * Layer 3 — derived condition surfaces (projection only, never canonical).
 */
export declare const WORLD_CONDITION_SURFACES_VERSION = "world-condition-surfaces-v1";
export declare const WorldConditionAxes: {
    readonly REGION_STABILITY: "region_stability";
    readonly PROSPERITY: "prosperity";
    readonly MILITARY_PRESSURE: "military_pressure";
    readonly MIGRATION_PRESSURE: "migration_pressure";
};
export type WorldConditionAxis = (typeof WorldConditionAxes)[keyof typeof WorldConditionAxes];
export type RegionStabilityLevel = 'stable' | 'strained' | 'unstable';
export type ProsperityLevel = 'growing' | 'steady' | 'declining';
export type MilitaryPressureLevel = 'low' | 'rising' | 'critical';
export type MigrationPressureLevel = 'low' | 'moderate' | 'severe';
export type WorldConditionLevel = RegionStabilityLevel | ProsperityLevel | MilitaryPressureLevel | MigrationPressureLevel;
export type WorldConditionSurface = {
    version: typeof WORLD_CONDITION_SURFACES_VERSION;
    scopeKind: 'region' | 'campaign';
    regionPageId: string | null;
    regionLabel: string | null;
    axis: WorldConditionAxis;
    level: WorldConditionLevel;
    confidence: 'low' | 'medium' | 'high';
    contributingEffectIds: string[];
    contributingAnchorIds: string[];
};
export type WorldConditionDeriveInput = {
    asOfEpochMinute: string;
    effects: Array<{
        id: string;
        domain: string;
        type: string;
        regionPageId?: string;
        orgPageId?: string;
        characterPageId?: string;
        signal?: string;
        phase?: string;
        pressureLevel?: string;
        stance?: string;
        kind?: string;
    }>;
    regionLabels: Map<string, string>;
};
export declare function deriveWorldConditionsAt(input: WorldConditionDeriveInput): WorldConditionSurface[];
export declare function formatConditionAxisLabel(axis: WorldConditionAxis): string;
//# sourceMappingURL=worldConditionSurfaces.d.ts.map