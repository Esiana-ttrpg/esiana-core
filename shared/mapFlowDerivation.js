"use strict";
/**
 * Layer 2 derivation helpers for simulation-aware map flow overlays.
 * @see docs/platform/map-flow-overlays.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultFlowDirection = defaultFlowDirection;
exports.defaultRibbonForFlowKind = defaultRibbonForFlowKind;
exports.buildRouteIdempotencyKey = buildRouteIdempotencyKey;
exports.buildClimateIdempotencyKey = buildClimateIdempotencyKey;
exports.buildPathSpine = buildPathSpine;
exports.climateAspectsFromSingle = climateAspectsFromSingle;
exports.monthKeyFromCalendar = monthKeyFromCalendar;
exports.overlayTemporalPair = overlayTemporalPair;
exports.isFlowOverlayStyle = isFlowOverlayStyle;
exports.flowOverlayLabel = flowOverlayLabel;
const mapOverlayTypes_js_1 = require("./mapOverlayTypes.js");
const mapGeometry_js_1 = require("./mapGeometry.js");
function defaultFlowDirection(flowKind) {
    switch (flowKind) {
        case 'trade':
            return 'bidirectional';
        case 'migration':
        case 'travel':
        default:
            return 'forward';
    }
}
function defaultRibbonForFlowKind(flowKind) {
    switch (flowKind) {
        case 'migration':
            return { baseWidth: 0.028, widthVariance: 0.012, opacity: 0.45 };
        case 'trade':
            return { baseWidth: 0.012, widthVariance: 0.002, opacity: 0.55 };
        case 'travel':
            return { baseWidth: 0.018, widthVariance: 0.004, opacity: 0.5 };
        default:
            return { baseWidth: 0.015, opacity: 0.5 };
    }
}
function buildRouteIdempotencyKey(input) {
    const sorted = [...input.sourceIds].sort().join('|');
    return `${input.derivedFromType}:${sorted}:${input.mapAssetId}:${input.flowKind}`;
}
function buildClimateIdempotencyKey(input) {
    return `seasonal_climate_projection:${input.calendarId}:${input.regionKey}:${input.monthKey}:${input.representsEpoch}:${input.mapAssetId}`;
}
/** v1 spine: straight line or one bend at midpoint offset. */
function buildPathSpine(origin, destination) {
    const dx = destination[0] - origin[0];
    const dy = destination[1] - origin[1];
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
        return (0, mapGeometry_js_1.lineStringGeometry)([origin, destination]);
    }
    const mid = [
        (origin[0] + destination[0]) / 2,
        (origin[1] + destination[1]) / 2,
    ];
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const bend = Math.min(0.06, dist * 0.15);
    const bendPoint = [
        mid[0] + perpX * bend,
        mid[1] + perpY * bend,
    ];
    return (0, mapGeometry_js_1.lineStringGeometry)([origin, bendPoint, destination]);
}
function climateAspectsFromSingle(aspect) {
    return [{ aspect, weight: 1 }];
}
function monthKeyFromCalendar(monthIndex, monthName) {
    return `${monthIndex}:${monthName}`;
}
function overlayTemporalPair(input) {
    return {
        generatedAtEpoch: input.generatedAtEpoch,
        representsEpoch: input.representsEpoch,
    };
}
function isFlowOverlayStyle(style) {
    const parsed = (0, mapOverlayTypes_js_1.parseMapFlowOverlayStyle)(style);
    return Boolean(parsed.flowKind || parsed.weatherOverlay);
}
function flowOverlayLabel(flowKind) {
    switch (flowKind) {
        case 'migration':
            return 'Migration corridor';
        case 'trade':
            return 'Trade route';
        case 'travel':
            return 'Travel route';
        default:
            return 'Flow path';
    }
}
//# sourceMappingURL=mapFlowDerivation.js.map