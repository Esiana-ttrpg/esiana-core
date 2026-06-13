/**
 * Map overlay semantics — geography vs geopolitical vs flow layers (Layer 3).
 * Stored in MapSceneObject.style JSON; layer kind inferred from layer name or object style.
 * @see docs/architecture-internal/map-border-overlays.md
 * @see docs/architecture-internal/map-flow-overlays.md
 * @see docs/architecture-internal/map-weather-overlays.md
 */
export declare const MapLayerKind: {
    readonly STANDARD: "standard";
    readonly POLITICAL_BORDER: "political_border";
    readonly MIGRATION_FLOW: "migration_flow";
    readonly TRADE_ROUTE: "trade_route";
    readonly TRAVEL_ROUTE: "travel_route";
    readonly WEATHER_OVERLAY: "weather_overlay";
};
export type MapLayerKindValue = (typeof MapLayerKind)[keyof typeof MapLayerKind];
export declare const MapObjectSemanticRole: {
    readonly REGION: "region";
    readonly POLITICAL_BORDER: "political_border";
    readonly FRONTLINE: "frontline";
    readonly CLAIM: "claim";
    readonly MIGRATION_CORRIDOR: "migration_corridor";
    readonly TRADE_ROUTE: "trade_route";
    readonly TRAVEL_ROUTE: "travel_route";
    readonly WEATHER_BAND: "weather_band";
    readonly MIGRATION_ORIGIN: "migration_origin";
    readonly MIGRATION_DESTINATION: "migration_destination";
};
export type MapObjectSemanticRoleValue = (typeof MapObjectSemanticRole)[keyof typeof MapObjectSemanticRole];
/** Default display names when creating flow layers from the map editor. */
export declare const POLITICAL_BORDERS_LAYER_NAME = "Political borders";
export declare const MIGRATION_FLOWS_LAYER_NAME = "Migration flows";
export declare const TRADE_ROUTES_LAYER_NAME = "Trade routes";
export declare const TRAVEL_ROUTES_LAYER_NAME = "Travel routes";
export declare const WEATHER_CLIMATE_LAYER_NAME = "Weather & climate";
export declare const POLITICAL_BORDERS_LAYER_COLOR = "#b45309";
export declare const MIGRATION_FLOWS_LAYER_COLOR = "#e11d48";
export declare const TRADE_ROUTES_LAYER_COLOR = "#059669";
export declare const TRAVEL_ROUTES_LAYER_COLOR = "#6366f1";
export declare const WEATHER_CLIMATE_LAYER_COLOR = "#0ea5e9";
export declare const MAP_FLOW_GENERATION_VERSION = "map-flow-overlay-v1";
export declare const OverlayLifecycle: {
    readonly DRAFT_GENERATED: "draft_generated";
    readonly CONFIRMED: "confirmed";
    readonly EDITED: "edited";
    readonly LOCKED: "locked";
    readonly SUPERSEDED: "superseded";
    readonly HISTORICAL: "historical";
};
export type OverlayLifecycleValue = (typeof OverlayLifecycle)[keyof typeof OverlayLifecycle];
export declare const DerivationStatus: {
    readonly FRESH: "fresh";
    readonly STALE: "stale";
    readonly RECOMPUTE_REQUIRED: "recompute_required";
    readonly FAILED: "failed";
};
export type DerivationStatusValue = (typeof DerivationStatus)[keyof typeof DerivationStatus];
export declare const OverlaySourceType: {
    readonly MANUAL: "manual";
    readonly DERIVED: "derived";
    readonly HYBRID: "hybrid";
};
export type OverlaySourceTypeValue = (typeof OverlaySourceType)[keyof typeof OverlaySourceType];
export declare const FlowKind: {
    readonly MIGRATION: "migration";
    readonly TRADE: "trade";
    readonly TRAVEL: "travel";
};
export type FlowKindValue = (typeof FlowKind)[keyof typeof FlowKind];
export declare const FlowDirection: {
    readonly FORWARD: "forward";
    readonly REVERSE: "reverse";
    readonly BIDIRECTIONAL: "bidirectional";
};
export type FlowDirectionValue = (typeof FlowDirection)[keyof typeof FlowDirection];
export declare const RibbonWidthUnit: {
    readonly NORMALIZED_MAP_SPACE: "normalized_map_space";
};
export type RibbonWidthUnitValue = (typeof RibbonWidthUnit)[keyof typeof RibbonWidthUnit];
export type MapLayerStyleRecord = {
    layerKind?: MapLayerKindValue;
};
export type TerritorySuggestionRecord = {
    atEpochMinute: string;
    stance: string;
    source?: string;
};
export type DerivedFromRecord = {
    type: string;
    sourceIds: string[];
    batchId?: string;
};
export type OverlayTemporalRecord = {
    generatedAtEpoch: string;
    representsEpoch: string;
};
export type GeoPathSegmentCost = {
    danger?: number;
    time?: number;
    tradeValue?: number;
};
export type GeoPathRecord = {
    segmentCosts: GeoPathSegmentCost[];
};
export type RibbonRecord = {
    baseWidth: number;
    widthVariance?: number;
    opacity?: number;
    widthUnit: RibbonWidthUnitValue;
};
export type MigrationWaveRecord = {
    originPageId: string;
    destinationPageId: string;
    populationEstimate?: number;
    departureWindow?: {
        fromEpoch: string;
        untilEpoch?: string;
    };
    arrivalWindow?: {
        fromEpoch: string;
        untilEpoch?: string;
    };
    flowCurve?: Array<{
        tEpoch: string;
        count: number;
    }>;
    attritionRate?: number;
    splitNodes?: Array<{
        junctionPageId: string;
        ratios: Record<string, number>;
    }>;
};
export type TradeRouteRecord = {
    trafficWeight: number;
    seasonModifiers?: Record<string, number>;
    economicSignal?: string;
};
export type WeatherOverlayRecord = {
    sourceMode: 'climate_projection' | 'event';
    weatherMode: 'climate' | 'event';
    climateAspects: Array<{
        aspect: string;
        weight: number;
    }>;
    seasonName?: string;
    intensity?: 'low' | 'moderate' | 'severe';
};
export type MapFlowOverlayStyle = {
    layerKind?: MapLayerKindValue;
    semanticRole?: MapObjectSemanticRoleValue;
    controllingOrgPageId?: string;
    territorySuggestion?: TerritorySuggestionRecord;
    overlayLifecycle?: OverlayLifecycleValue;
    derivationStatus?: DerivationStatusValue;
    sourceType?: OverlaySourceTypeValue;
    derivedFrom?: DerivedFromRecord;
    generationVersion?: string;
    confidence?: 'low' | 'medium' | 'high';
    idempotencyKey?: string;
    overlayTemporal?: OverlayTemporalRecord;
    flowKind?: FlowKindValue;
    flowDirection?: FlowDirectionValue;
    geoPath?: GeoPathRecord;
    constraints?: {
        terrain?: string;
        seasonality?: string;
        politicalControl?: string;
    };
    ribbon?: RibbonRecord;
    migrationWave?: MigrationWaveRecord;
    tradeRoute?: TradeRouteRecord;
    weatherOverlay?: WeatherOverlayRecord;
};
export type MapObjectStyleRecord = MapFlowOverlayStyle;
export declare function parseMapLayerKind(value: unknown): MapLayerKindValue;
export declare function parseMapObjectSemanticRole(value: unknown): MapObjectSemanticRoleValue;
export declare function parseMapFlowOverlayStyle(style: unknown): MapFlowOverlayStyle;
export declare function parseMapLayerStyle(style: unknown): MapLayerStyleRecord;
export declare function parseMapObjectOverlayStyle(style: unknown): MapObjectStyleRecord;
export declare function inferMapLayerKind(layer: {
    name: string;
    style?: unknown;
}): MapLayerKindValue;
export declare function defaultSemanticRoleForLayer(layerKind: MapLayerKindValue, objectKind: string): MapObjectSemanticRoleValue;
export declare function layerTemplateForKind(layerKind: MapLayerKindValue): {
    name: string;
    color: string;
} | null;
export declare function mergeObjectStyleWithOverlay(baseStyle: unknown, overlay: MapObjectStyleRecord): Record<string, unknown>;
export declare function layerKindBadgeLabel(kind: MapLayerKindValue): string | null;
export declare function isFlowPathOverlay(style: unknown): boolean;
export declare function isWeatherBandOverlay(style: unknown): boolean;
//# sourceMappingURL=mapOverlayTypes.d.ts.map