/**
 * Layer 2 derivation helpers for simulation-aware map flow overlays.
 * @see docs/architecture-internal/map-flow-overlays.md
 */
import { type FlowDirectionValue, type FlowKindValue, type MapFlowOverlayStyle } from './mapOverlayTypes.js';
import { lineStringGeometry, type NormalizedPoint } from './mapGeometry.js';
export type DerivedFromRecord = {
    type: string;
    sourceIds: string[];
    batchId?: string;
};
export type ClimateAspectWeight = {
    aspect: string;
    weight: number;
};
export declare function defaultFlowDirection(flowKind: FlowKindValue): FlowDirectionValue;
export declare function defaultRibbonForFlowKind(flowKind: FlowKindValue): {
    baseWidth: number;
    widthVariance?: number;
    opacity?: number;
};
export declare function buildRouteIdempotencyKey(input: {
    derivedFromType: string;
    sourceIds: string[];
    mapAssetId: string;
    flowKind: FlowKindValue;
}): string;
export declare function buildClimateIdempotencyKey(input: {
    calendarId: string;
    regionKey: string;
    monthKey: string;
    representsEpoch: string;
    mapAssetId: string;
}): string;
/** v1 spine: straight line or one bend at midpoint offset. */
export declare function buildPathSpine(origin: NormalizedPoint, destination: NormalizedPoint): ReturnType<typeof lineStringGeometry>;
export declare function climateAspectsFromSingle(aspect: string): ClimateAspectWeight[];
export declare function monthKeyFromCalendar(monthIndex: number, monthName: string): string;
export declare function overlayTemporalPair(input: {
    generatedAtEpoch: string;
    representsEpoch: string;
}): MapFlowOverlayStyle['overlayTemporal'];
export declare function isFlowOverlayStyle(style: unknown): boolean;
export declare function flowOverlayLabel(flowKind: FlowKindValue): string;
//# sourceMappingURL=mapFlowDerivation.d.ts.map