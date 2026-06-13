"use strict";
/**
 * Map overlay semantics — geography vs geopolitical vs flow layers (Layer 3).
 * Stored in MapSceneObject.style JSON; layer kind inferred from layer name or object style.
 * @see docs/platform/map-border-overlays.md
 * @see docs/platform/map-flow-overlays.md
 * @see docs/platform/map-weather-overlays.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RibbonWidthUnit = exports.FlowDirection = exports.FlowKind = exports.OverlaySourceType = exports.DerivationStatus = exports.OverlayLifecycle = exports.MAP_FLOW_GENERATION_VERSION = exports.WEATHER_CLIMATE_LAYER_COLOR = exports.TRAVEL_ROUTES_LAYER_COLOR = exports.TRADE_ROUTES_LAYER_COLOR = exports.MIGRATION_FLOWS_LAYER_COLOR = exports.POLITICAL_BORDERS_LAYER_COLOR = exports.WEATHER_CLIMATE_LAYER_NAME = exports.TRAVEL_ROUTES_LAYER_NAME = exports.TRADE_ROUTES_LAYER_NAME = exports.MIGRATION_FLOWS_LAYER_NAME = exports.POLITICAL_BORDERS_LAYER_NAME = exports.MapObjectSemanticRole = exports.MapLayerKind = void 0;
exports.parseMapLayerKind = parseMapLayerKind;
exports.parseMapObjectSemanticRole = parseMapObjectSemanticRole;
exports.parseMapFlowOverlayStyle = parseMapFlowOverlayStyle;
exports.parseMapLayerStyle = parseMapLayerStyle;
exports.parseMapObjectOverlayStyle = parseMapObjectOverlayStyle;
exports.inferMapLayerKind = inferMapLayerKind;
exports.defaultSemanticRoleForLayer = defaultSemanticRoleForLayer;
exports.layerTemplateForKind = layerTemplateForKind;
exports.mergeObjectStyleWithOverlay = mergeObjectStyleWithOverlay;
exports.layerKindBadgeLabel = layerKindBadgeLabel;
exports.isFlowPathOverlay = isFlowPathOverlay;
exports.isWeatherBandOverlay = isWeatherBandOverlay;
exports.MapLayerKind = {
    STANDARD: 'standard',
    POLITICAL_BORDER: 'political_border',
    MIGRATION_FLOW: 'migration_flow',
    TRADE_ROUTE: 'trade_route',
    TRAVEL_ROUTE: 'travel_route',
    WEATHER_OVERLAY: 'weather_overlay',
};
exports.MapObjectSemanticRole = {
    REGION: 'region',
    POLITICAL_BORDER: 'political_border',
    FRONTLINE: 'frontline',
    CLAIM: 'claim',
    MIGRATION_CORRIDOR: 'migration_corridor',
    TRADE_ROUTE: 'trade_route',
    TRAVEL_ROUTE: 'travel_route',
    WEATHER_BAND: 'weather_band',
    MIGRATION_ORIGIN: 'migration_origin',
    MIGRATION_DESTINATION: 'migration_destination',
};
/** Default display names when creating flow layers from the map editor. */
exports.POLITICAL_BORDERS_LAYER_NAME = 'Political borders';
exports.MIGRATION_FLOWS_LAYER_NAME = 'Migration flows';
exports.TRADE_ROUTES_LAYER_NAME = 'Trade routes';
exports.TRAVEL_ROUTES_LAYER_NAME = 'Travel routes';
exports.WEATHER_CLIMATE_LAYER_NAME = 'Weather & climate';
exports.POLITICAL_BORDERS_LAYER_COLOR = '#b45309';
exports.MIGRATION_FLOWS_LAYER_COLOR = '#e11d48';
exports.TRADE_ROUTES_LAYER_COLOR = '#059669';
exports.TRAVEL_ROUTES_LAYER_COLOR = '#6366f1';
exports.WEATHER_CLIMATE_LAYER_COLOR = '#0ea5e9';
exports.MAP_FLOW_GENERATION_VERSION = 'map-flow-overlay-v1';
exports.OverlayLifecycle = {
    DRAFT_GENERATED: 'draft_generated',
    CONFIRMED: 'confirmed',
    EDITED: 'edited',
    LOCKED: 'locked',
    SUPERSEDED: 'superseded',
    HISTORICAL: 'historical',
};
exports.DerivationStatus = {
    FRESH: 'fresh',
    STALE: 'stale',
    RECOMPUTE_REQUIRED: 'recompute_required',
    FAILED: 'failed',
};
exports.OverlaySourceType = {
    MANUAL: 'manual',
    DERIVED: 'derived',
    HYBRID: 'hybrid',
};
exports.FlowKind = {
    MIGRATION: 'migration',
    TRADE: 'trade',
    TRAVEL: 'travel',
};
exports.FlowDirection = {
    FORWARD: 'forward',
    REVERSE: 'reverse',
    BIDIRECTIONAL: 'bidirectional',
};
exports.RibbonWidthUnit = {
    NORMALIZED_MAP_SPACE: 'normalized_map_space',
};
const MAP_LAYER_KIND_VALUES = new Set(Object.values(exports.MapLayerKind));
const MAP_OBJECT_SEMANTIC_ROLE_VALUES = new Set(Object.values(exports.MapObjectSemanticRole));
const OVERLAY_LIFECYCLE_VALUES = new Set(Object.values(exports.OverlayLifecycle));
const DERIVATION_STATUS_VALUES = new Set(Object.values(exports.DerivationStatus));
const OVERLAY_SOURCE_TYPE_VALUES = new Set(Object.values(exports.OverlaySourceType));
const FLOW_KIND_VALUES = new Set(Object.values(exports.FlowKind));
const FLOW_DIRECTION_VALUES = new Set(Object.values(exports.FlowDirection));
const RIBBON_WIDTH_UNIT_VALUES = new Set(Object.values(exports.RibbonWidthUnit));
const LAYER_NAME_TO_KIND = {
    [exports.POLITICAL_BORDERS_LAYER_NAME]: exports.MapLayerKind.POLITICAL_BORDER,
    [exports.MIGRATION_FLOWS_LAYER_NAME]: exports.MapLayerKind.MIGRATION_FLOW,
    [exports.TRADE_ROUTES_LAYER_NAME]: exports.MapLayerKind.TRADE_ROUTE,
    [exports.TRAVEL_ROUTES_LAYER_NAME]: exports.MapLayerKind.TRAVEL_ROUTE,
    [exports.WEATHER_CLIMATE_LAYER_NAME]: exports.MapLayerKind.WEATHER_OVERLAY,
};
function parseMapLayerKind(value) {
    if (typeof value === 'string' && MAP_LAYER_KIND_VALUES.has(value)) {
        return value;
    }
    return exports.MapLayerKind.STANDARD;
}
function parseMapObjectSemanticRole(value) {
    if (typeof value === 'string' && MAP_OBJECT_SEMANTIC_ROLE_VALUES.has(value)) {
        return value;
    }
    return exports.MapObjectSemanticRole.REGION;
}
function parseDerivedFrom(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const row = value;
    if (typeof row.type !== 'string')
        return undefined;
    const sourceIds = Array.isArray(row.sourceIds)
        ? row.sourceIds.filter((id) => typeof id === 'string')
        : [];
    return {
        type: row.type,
        sourceIds,
        batchId: typeof row.batchId === 'string' ? row.batchId : undefined,
    };
}
function parseOverlayTemporal(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const row = value;
    if (typeof row.generatedAtEpoch !== 'string' || typeof row.representsEpoch !== 'string') {
        return undefined;
    }
    return {
        generatedAtEpoch: row.generatedAtEpoch,
        representsEpoch: row.representsEpoch,
    };
}
function parseRibbon(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const row = value;
    if (typeof row.baseWidth !== 'number')
        return undefined;
    const widthUnit = typeof row.widthUnit === 'string' && RIBBON_WIDTH_UNIT_VALUES.has(row.widthUnit)
        ? row.widthUnit
        : exports.RibbonWidthUnit.NORMALIZED_MAP_SPACE;
    return {
        baseWidth: row.baseWidth,
        widthVariance: typeof row.widthVariance === 'number' ? row.widthVariance : undefined,
        opacity: typeof row.opacity === 'number' ? row.opacity : undefined,
        widthUnit,
    };
}
function parseGeoPath(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const row = value;
    const segmentCosts = Array.isArray(row.segmentCosts)
        ? row.segmentCosts
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry) => entry)
        : [];
    return { segmentCosts };
}
function parseMigrationWave(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const row = value;
    if (typeof row.originPageId !== 'string' || typeof row.destinationPageId !== 'string') {
        return undefined;
    }
    return {
        originPageId: row.originPageId,
        destinationPageId: row.destinationPageId,
        populationEstimate: typeof row.populationEstimate === 'number' ? row.populationEstimate : undefined,
        departureWindow: row.departureWindow && typeof row.departureWindow === 'object'
            ? row.departureWindow
            : undefined,
        arrivalWindow: row.arrivalWindow && typeof row.arrivalWindow === 'object'
            ? row.arrivalWindow
            : undefined,
        flowCurve: Array.isArray(row.flowCurve)
            ? row.flowCurve
            : undefined,
        attritionRate: typeof row.attritionRate === 'number' ? row.attritionRate : undefined,
        splitNodes: Array.isArray(row.splitNodes)
            ? row.splitNodes
            : undefined,
    };
}
function parseTradeRoute(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const row = value;
    if (typeof row.trafficWeight !== 'number')
        return undefined;
    return {
        trafficWeight: row.trafficWeight,
        seasonModifiers: row.seasonModifiers && typeof row.seasonModifiers === 'object'
            ? row.seasonModifiers
            : undefined,
        economicSignal: typeof row.economicSignal === 'string' ? row.economicSignal : undefined,
    };
}
function parseWeatherOverlay(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const row = value;
    const sourceMode = row.sourceMode === 'event' ? 'event' : 'climate_projection';
    const weatherMode = row.weatherMode === 'event' ? 'event' : 'climate';
    const climateAspects = Array.isArray(row.climateAspects)
        ? row.climateAspects
            .filter((entry) => Boolean(entry) &&
            typeof entry === 'object' &&
            typeof entry.aspect === 'string' &&
            typeof entry.weight === 'number')
            .map((entry) => ({ aspect: entry.aspect, weight: entry.weight }))
        : [];
    if (climateAspects.length === 0)
        return undefined;
    return {
        sourceMode,
        weatherMode,
        climateAspects,
        seasonName: typeof row.seasonName === 'string' ? row.seasonName : undefined,
        intensity: row.intensity === 'low' || row.intensity === 'moderate' || row.intensity === 'severe'
            ? row.intensity
            : undefined,
    };
}
function parseMapFlowOverlayStyle(style) {
    if (!style || typeof style !== 'object')
        return {};
    const record = style;
    const out = {};
    if (record.layerKind !== undefined) {
        out.layerKind = parseMapLayerKind(record.layerKind);
    }
    if (record.semanticRole !== undefined) {
        out.semanticRole = parseMapObjectSemanticRole(record.semanticRole);
    }
    if (typeof record.controllingOrgPageId === 'string' && record.controllingOrgPageId.trim()) {
        out.controllingOrgPageId = record.controllingOrgPageId.trim();
    }
    if (record.territorySuggestion && typeof record.territorySuggestion === 'object') {
        const ts = record.territorySuggestion;
        if (typeof ts.atEpochMinute === 'string' && typeof ts.stance === 'string') {
            out.territorySuggestion = {
                atEpochMinute: ts.atEpochMinute,
                stance: ts.stance,
                source: typeof ts.source === 'string' ? ts.source : undefined,
            };
        }
    }
    if (typeof record.overlayLifecycle === 'string' &&
        OVERLAY_LIFECYCLE_VALUES.has(record.overlayLifecycle)) {
        out.overlayLifecycle = record.overlayLifecycle;
    }
    if (typeof record.derivationStatus === 'string' &&
        DERIVATION_STATUS_VALUES.has(record.derivationStatus)) {
        out.derivationStatus = record.derivationStatus;
    }
    if (typeof record.sourceType === 'string' &&
        OVERLAY_SOURCE_TYPE_VALUES.has(record.sourceType)) {
        out.sourceType = record.sourceType;
    }
    if (typeof record.generationVersion === 'string') {
        out.generationVersion = record.generationVersion;
    }
    if (typeof record.idempotencyKey === 'string') {
        out.idempotencyKey = record.idempotencyKey;
    }
    if (record.confidence === 'low' || record.confidence === 'medium' || record.confidence === 'high') {
        out.confidence = record.confidence;
    }
    const derivedFrom = parseDerivedFrom(record.derivedFrom);
    if (derivedFrom)
        out.derivedFrom = derivedFrom;
    const overlayTemporal = parseOverlayTemporal(record.overlayTemporal);
    if (overlayTemporal)
        out.overlayTemporal = overlayTemporal;
    if (typeof record.flowKind === 'string' && FLOW_KIND_VALUES.has(record.flowKind)) {
        out.flowKind = record.flowKind;
    }
    if (typeof record.flowDirection === 'string' &&
        FLOW_DIRECTION_VALUES.has(record.flowDirection)) {
        out.flowDirection = record.flowDirection;
    }
    const geoPath = parseGeoPath(record.geoPath);
    if (geoPath)
        out.geoPath = geoPath;
    const ribbon = parseRibbon(record.ribbon);
    if (ribbon)
        out.ribbon = ribbon;
    const migrationWave = parseMigrationWave(record.migrationWave);
    if (migrationWave)
        out.migrationWave = migrationWave;
    const tradeRoute = parseTradeRoute(record.tradeRoute);
    if (tradeRoute)
        out.tradeRoute = tradeRoute;
    const weatherOverlay = parseWeatherOverlay(record.weatherOverlay);
    if (weatherOverlay)
        out.weatherOverlay = weatherOverlay;
    if (record.constraints && typeof record.constraints === 'object') {
        out.constraints = record.constraints;
    }
    return out;
}
function parseMapLayerStyle(style) {
    if (!style || typeof style !== 'object')
        return {};
    const record = style;
    const layerKind = parseMapLayerKind(record.layerKind);
    return layerKind === exports.MapLayerKind.STANDARD && record.layerKind === undefined
        ? {}
        : { layerKind };
}
function parseMapObjectOverlayStyle(style) {
    return parseMapFlowOverlayStyle(style);
}
function inferMapLayerKind(layer) {
    const fromStyle = parseMapLayerStyle(layer.style).layerKind;
    if (fromStyle && fromStyle !== exports.MapLayerKind.STANDARD)
        return fromStyle;
    const fromName = LAYER_NAME_TO_KIND[layer.name.trim()];
    if (fromName)
        return fromName;
    return exports.MapLayerKind.STANDARD;
}
function defaultSemanticRoleForLayer(layerKind, objectKind) {
    if (objectKind !== 'region' && objectKind !== 'path') {
        return exports.MapObjectSemanticRole.REGION;
    }
    switch (layerKind) {
        case exports.MapLayerKind.POLITICAL_BORDER:
            return exports.MapObjectSemanticRole.POLITICAL_BORDER;
        case exports.MapLayerKind.MIGRATION_FLOW:
            return exports.MapObjectSemanticRole.MIGRATION_CORRIDOR;
        case exports.MapLayerKind.TRADE_ROUTE:
            return exports.MapObjectSemanticRole.TRADE_ROUTE;
        case exports.MapLayerKind.TRAVEL_ROUTE:
            return exports.MapObjectSemanticRole.TRAVEL_ROUTE;
        case exports.MapLayerKind.WEATHER_OVERLAY:
            return exports.MapObjectSemanticRole.WEATHER_BAND;
        default:
            return exports.MapObjectSemanticRole.REGION;
    }
}
function layerTemplateForKind(layerKind) {
    switch (layerKind) {
        case exports.MapLayerKind.POLITICAL_BORDER:
            return { name: exports.POLITICAL_BORDERS_LAYER_NAME, color: exports.POLITICAL_BORDERS_LAYER_COLOR };
        case exports.MapLayerKind.MIGRATION_FLOW:
            return { name: exports.MIGRATION_FLOWS_LAYER_NAME, color: exports.MIGRATION_FLOWS_LAYER_COLOR };
        case exports.MapLayerKind.TRADE_ROUTE:
            return { name: exports.TRADE_ROUTES_LAYER_NAME, color: exports.TRADE_ROUTES_LAYER_COLOR };
        case exports.MapLayerKind.TRAVEL_ROUTE:
            return { name: exports.TRAVEL_ROUTES_LAYER_NAME, color: exports.TRAVEL_ROUTES_LAYER_COLOR };
        case exports.MapLayerKind.WEATHER_OVERLAY:
            return { name: exports.WEATHER_CLIMATE_LAYER_NAME, color: exports.WEATHER_CLIMATE_LAYER_COLOR };
        default:
            return null;
    }
}
function mergeObjectStyleWithOverlay(baseStyle, overlay) {
    const base = baseStyle && typeof baseStyle === 'object'
        ? { ...baseStyle }
        : {};
    if (overlay.layerKind)
        base.layerKind = overlay.layerKind;
    if (overlay.semanticRole)
        base.semanticRole = overlay.semanticRole;
    if (overlay.controllingOrgPageId) {
        base.controllingOrgPageId = overlay.controllingOrgPageId;
    }
    if (overlay.territorySuggestion) {
        base.territorySuggestion = overlay.territorySuggestion;
    }
    if (overlay.overlayLifecycle)
        base.overlayLifecycle = overlay.overlayLifecycle;
    if (overlay.derivationStatus)
        base.derivationStatus = overlay.derivationStatus;
    if (overlay.sourceType)
        base.sourceType = overlay.sourceType;
    if (overlay.derivedFrom)
        base.derivedFrom = overlay.derivedFrom;
    if (overlay.generationVersion)
        base.generationVersion = overlay.generationVersion;
    if (overlay.confidence)
        base.confidence = overlay.confidence;
    if (overlay.idempotencyKey)
        base.idempotencyKey = overlay.idempotencyKey;
    if (overlay.overlayTemporal)
        base.overlayTemporal = overlay.overlayTemporal;
    if (overlay.flowKind)
        base.flowKind = overlay.flowKind;
    if (overlay.flowDirection)
        base.flowDirection = overlay.flowDirection;
    if (overlay.geoPath)
        base.geoPath = overlay.geoPath;
    if (overlay.constraints)
        base.constraints = overlay.constraints;
    if (overlay.ribbon)
        base.ribbon = overlay.ribbon;
    if (overlay.migrationWave)
        base.migrationWave = overlay.migrationWave;
    if (overlay.tradeRoute)
        base.tradeRoute = overlay.tradeRoute;
    if (overlay.weatherOverlay)
        base.weatherOverlay = overlay.weatherOverlay;
    return base;
}
function layerKindBadgeLabel(kind) {
    switch (kind) {
        case exports.MapLayerKind.POLITICAL_BORDER:
            return 'Borders';
        case exports.MapLayerKind.MIGRATION_FLOW:
            return 'Migration';
        case exports.MapLayerKind.TRADE_ROUTE:
            return 'Trade';
        case exports.MapLayerKind.TRAVEL_ROUTE:
            return 'Routes';
        case exports.MapLayerKind.WEATHER_OVERLAY:
            return 'Weather';
        default:
            return null;
    }
}
function isFlowPathOverlay(style) {
    const parsed = parseMapFlowOverlayStyle(style);
    return Boolean(parsed.flowKind && parsed.ribbon);
}
function isWeatherBandOverlay(style) {
    const parsed = parseMapFlowOverlayStyle(style);
    return Boolean(parsed.weatherOverlay);
}
//# sourceMappingURL=mapOverlayTypes.js.map