/**
 * Map overlay semantics — geography vs geopolitical vs flow layers (Layer 3).
 * Stored in MapSceneObject.style JSON; layer kind inferred from layer name or object style.
 * @see docs/architecture-internal/map-border-overlays.md
 * @see docs/architecture-internal/map-flow-overlays.md
 * @see docs/architecture-internal/map-weather-overlays.md
 */

export const MapLayerKind = {
  STANDARD: 'standard',
  POLITICAL_BORDER: 'political_border',
  MIGRATION_FLOW: 'migration_flow',
  TRADE_ROUTE: 'trade_route',
  TRAVEL_ROUTE: 'travel_route',
  WEATHER_OVERLAY: 'weather_overlay',
} as const;

export type MapLayerKindValue =
  (typeof MapLayerKind)[keyof typeof MapLayerKind];

export const MapObjectSemanticRole = {
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
} as const;

export type MapObjectSemanticRoleValue =
  (typeof MapObjectSemanticRole)[keyof typeof MapObjectSemanticRole];

/** Default display names when creating flow layers from the map editor. */
export const POLITICAL_BORDERS_LAYER_NAME = 'Political borders';
export const MIGRATION_FLOWS_LAYER_NAME = 'Migration flows';
export const TRADE_ROUTES_LAYER_NAME = 'Trade routes';
export const TRAVEL_ROUTES_LAYER_NAME = 'Travel routes';
export const WEATHER_CLIMATE_LAYER_NAME = 'Weather & climate';

export const POLITICAL_BORDERS_LAYER_COLOR = '#b45309';
export const MIGRATION_FLOWS_LAYER_COLOR = '#e11d48';
export const TRADE_ROUTES_LAYER_COLOR = '#059669';
export const TRAVEL_ROUTES_LAYER_COLOR = '#6366f1';
export const WEATHER_CLIMATE_LAYER_COLOR = '#0ea5e9';

export const MAP_FLOW_GENERATION_VERSION = 'map-flow-overlay-v1';

export const OverlayLifecycle = {
  DRAFT_GENERATED: 'draft_generated',
  CONFIRMED: 'confirmed',
  EDITED: 'edited',
  LOCKED: 'locked',
  SUPERSEDED: 'superseded',
  HISTORICAL: 'historical',
} as const;

export type OverlayLifecycleValue =
  (typeof OverlayLifecycle)[keyof typeof OverlayLifecycle];

export const DerivationStatus = {
  FRESH: 'fresh',
  STALE: 'stale',
  RECOMPUTE_REQUIRED: 'recompute_required',
  FAILED: 'failed',
} as const;

export type DerivationStatusValue =
  (typeof DerivationStatus)[keyof typeof DerivationStatus];

export const OverlaySourceType = {
  MANUAL: 'manual',
  DERIVED: 'derived',
  HYBRID: 'hybrid',
} as const;

export type OverlaySourceTypeValue =
  (typeof OverlaySourceType)[keyof typeof OverlaySourceType];

export const FlowKind = {
  MIGRATION: 'migration',
  TRADE: 'trade',
  TRAVEL: 'travel',
} as const;

export type FlowKindValue = (typeof FlowKind)[keyof typeof FlowKind];

export const FlowDirection = {
  FORWARD: 'forward',
  REVERSE: 'reverse',
  BIDIRECTIONAL: 'bidirectional',
} as const;

export type FlowDirectionValue =
  (typeof FlowDirection)[keyof typeof FlowDirection];

export const RibbonWidthUnit = {
  NORMALIZED_MAP_SPACE: 'normalized_map_space',
} as const;

export type RibbonWidthUnitValue =
  (typeof RibbonWidthUnit)[keyof typeof RibbonWidthUnit];

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
  departureWindow?: { fromEpoch: string; untilEpoch?: string };
  arrivalWindow?: { fromEpoch: string; untilEpoch?: string };
  flowCurve?: Array<{ tEpoch: string; count: number }>;
  attritionRate?: number;
  splitNodes?: Array<{ junctionPageId: string; ratios: Record<string, number> }>;
};

export type TradeRouteRecord = {
  trafficWeight: number;
  seasonModifiers?: Record<string, number>;
  economicSignal?: string;
};

export type WeatherOverlayRecord = {
  sourceMode: 'climate_projection' | 'event';
  weatherMode: 'climate' | 'event';
  climateAspects: Array<{ aspect: string; weight: number }>;
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
  constraints?: { terrain?: string; seasonality?: string; politicalControl?: string };
  ribbon?: RibbonRecord;
  migrationWave?: MigrationWaveRecord;
  tradeRoute?: TradeRouteRecord;
  weatherOverlay?: WeatherOverlayRecord;
};

export type MapObjectStyleRecord = MapFlowOverlayStyle;

const MAP_LAYER_KIND_VALUES = new Set<string>(Object.values(MapLayerKind));
const MAP_OBJECT_SEMANTIC_ROLE_VALUES = new Set<string>(
  Object.values(MapObjectSemanticRole),
);
const OVERLAY_LIFECYCLE_VALUES = new Set<string>(Object.values(OverlayLifecycle));
const DERIVATION_STATUS_VALUES = new Set<string>(Object.values(DerivationStatus));
const OVERLAY_SOURCE_TYPE_VALUES = new Set<string>(Object.values(OverlaySourceType));
const FLOW_KIND_VALUES = new Set<string>(Object.values(FlowKind));
const FLOW_DIRECTION_VALUES = new Set<string>(Object.values(FlowDirection));
const RIBBON_WIDTH_UNIT_VALUES = new Set<string>(Object.values(RibbonWidthUnit));

const LAYER_NAME_TO_KIND: Record<string, MapLayerKindValue> = {
  [POLITICAL_BORDERS_LAYER_NAME]: MapLayerKind.POLITICAL_BORDER,
  [MIGRATION_FLOWS_LAYER_NAME]: MapLayerKind.MIGRATION_FLOW,
  [TRADE_ROUTES_LAYER_NAME]: MapLayerKind.TRADE_ROUTE,
  [TRAVEL_ROUTES_LAYER_NAME]: MapLayerKind.TRAVEL_ROUTE,
  [WEATHER_CLIMATE_LAYER_NAME]: MapLayerKind.WEATHER_OVERLAY,
};

export function parseMapLayerKind(value: unknown): MapLayerKindValue {
  if (typeof value === 'string' && MAP_LAYER_KIND_VALUES.has(value)) {
    return value as MapLayerKindValue;
  }
  return MapLayerKind.STANDARD;
}

export function parseMapObjectSemanticRole(
  value: unknown,
): MapObjectSemanticRoleValue {
  if (typeof value === 'string' && MAP_OBJECT_SEMANTIC_ROLE_VALUES.has(value)) {
    return value as MapObjectSemanticRoleValue;
  }
  return MapObjectSemanticRole.REGION;
}

function parseDerivedFrom(value: unknown): DerivedFromRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.type !== 'string') return undefined;
  const sourceIds = Array.isArray(row.sourceIds)
    ? row.sourceIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    type: row.type,
    sourceIds,
    batchId: typeof row.batchId === 'string' ? row.batchId : undefined,
  };
}

function parseOverlayTemporal(value: unknown): OverlayTemporalRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.generatedAtEpoch !== 'string' || typeof row.representsEpoch !== 'string') {
    return undefined;
  }
  return {
    generatedAtEpoch: row.generatedAtEpoch,
    representsEpoch: row.representsEpoch,
  };
}

function parseRibbon(value: unknown): RibbonRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.baseWidth !== 'number') return undefined;
  const widthUnit =
    typeof row.widthUnit === 'string' && RIBBON_WIDTH_UNIT_VALUES.has(row.widthUnit)
      ? (row.widthUnit as RibbonWidthUnitValue)
      : RibbonWidthUnit.NORMALIZED_MAP_SPACE;
  return {
    baseWidth: row.baseWidth,
    widthVariance: typeof row.widthVariance === 'number' ? row.widthVariance : undefined,
    opacity: typeof row.opacity === 'number' ? row.opacity : undefined,
    widthUnit,
  };
}

function parseGeoPath(value: unknown): GeoPathRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const segmentCosts = Array.isArray(row.segmentCosts)
    ? row.segmentCosts
        .filter((entry): entry is GeoPathSegmentCost => entry && typeof entry === 'object')
        .map((entry) => entry as GeoPathSegmentCost)
    : [];
  return { segmentCosts };
}

function parseMigrationWave(value: unknown): MigrationWaveRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.originPageId !== 'string' || typeof row.destinationPageId !== 'string') {
    return undefined;
  }
  return {
    originPageId: row.originPageId,
    destinationPageId: row.destinationPageId,
    populationEstimate:
      typeof row.populationEstimate === 'number' ? row.populationEstimate : undefined,
    departureWindow:
      row.departureWindow && typeof row.departureWindow === 'object'
        ? (row.departureWindow as MigrationWaveRecord['departureWindow'])
        : undefined,
    arrivalWindow:
      row.arrivalWindow && typeof row.arrivalWindow === 'object'
        ? (row.arrivalWindow as MigrationWaveRecord['arrivalWindow'])
        : undefined,
    flowCurve: Array.isArray(row.flowCurve)
      ? (row.flowCurve as MigrationWaveRecord['flowCurve'])
      : undefined,
    attritionRate: typeof row.attritionRate === 'number' ? row.attritionRate : undefined,
    splitNodes: Array.isArray(row.splitNodes)
      ? (row.splitNodes as MigrationWaveRecord['splitNodes'])
      : undefined,
  };
}

function parseTradeRoute(value: unknown): TradeRouteRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.trafficWeight !== 'number') return undefined;
  return {
    trafficWeight: row.trafficWeight,
    seasonModifiers:
      row.seasonModifiers && typeof row.seasonModifiers === 'object'
        ? (row.seasonModifiers as Record<string, number>)
        : undefined,
    economicSignal: typeof row.economicSignal === 'string' ? row.economicSignal : undefined,
  };
}

function parseWeatherOverlay(value: unknown): WeatherOverlayRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const sourceMode = row.sourceMode === 'event' ? 'event' : 'climate_projection';
  const weatherMode = row.weatherMode === 'event' ? 'event' : 'climate';
  const climateAspects = Array.isArray(row.climateAspects)
    ? row.climateAspects
        .filter(
          (entry): entry is { aspect: string; weight: number } =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof (entry as { aspect?: unknown }).aspect === 'string' &&
            typeof (entry as { weight?: unknown }).weight === 'number',
        )
        .map((entry) => ({ aspect: entry.aspect, weight: entry.weight }))
    : [];
  if (climateAspects.length === 0) return undefined;
  return {
    sourceMode,
    weatherMode,
    climateAspects,
    seasonName: typeof row.seasonName === 'string' ? row.seasonName : undefined,
    intensity:
      row.intensity === 'low' || row.intensity === 'moderate' || row.intensity === 'severe'
        ? row.intensity
        : undefined,
  };
}

export function parseMapFlowOverlayStyle(style: unknown): MapFlowOverlayStyle {
  if (!style || typeof style !== 'object') return {};
  const record = style as Record<string, unknown>;
  const out: MapFlowOverlayStyle = {};
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
    const ts = record.territorySuggestion as Record<string, unknown>;
    if (typeof ts.atEpochMinute === 'string' && typeof ts.stance === 'string') {
      out.territorySuggestion = {
        atEpochMinute: ts.atEpochMinute,
        stance: ts.stance,
        source: typeof ts.source === 'string' ? ts.source : undefined,
      };
    }
  }

  if (
    typeof record.overlayLifecycle === 'string' &&
    OVERLAY_LIFECYCLE_VALUES.has(record.overlayLifecycle)
  ) {
    out.overlayLifecycle = record.overlayLifecycle as OverlayLifecycleValue;
  }
  if (
    typeof record.derivationStatus === 'string' &&
    DERIVATION_STATUS_VALUES.has(record.derivationStatus)
  ) {
    out.derivationStatus = record.derivationStatus as DerivationStatusValue;
  }
  if (
    typeof record.sourceType === 'string' &&
    OVERLAY_SOURCE_TYPE_VALUES.has(record.sourceType)
  ) {
    out.sourceType = record.sourceType as OverlaySourceTypeValue;
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
  if (derivedFrom) out.derivedFrom = derivedFrom;
  const overlayTemporal = parseOverlayTemporal(record.overlayTemporal);
  if (overlayTemporal) out.overlayTemporal = overlayTemporal;

  if (typeof record.flowKind === 'string' && FLOW_KIND_VALUES.has(record.flowKind)) {
    out.flowKind = record.flowKind as FlowKindValue;
  }
  if (
    typeof record.flowDirection === 'string' &&
    FLOW_DIRECTION_VALUES.has(record.flowDirection)
  ) {
    out.flowDirection = record.flowDirection as FlowDirectionValue;
  }

  const geoPath = parseGeoPath(record.geoPath);
  if (geoPath) out.geoPath = geoPath;
  const ribbon = parseRibbon(record.ribbon);
  if (ribbon) out.ribbon = ribbon;
  const migrationWave = parseMigrationWave(record.migrationWave);
  if (migrationWave) out.migrationWave = migrationWave;
  const tradeRoute = parseTradeRoute(record.tradeRoute);
  if (tradeRoute) out.tradeRoute = tradeRoute;
  const weatherOverlay = parseWeatherOverlay(record.weatherOverlay);
  if (weatherOverlay) out.weatherOverlay = weatherOverlay;

  if (record.constraints && typeof record.constraints === 'object') {
    out.constraints = record.constraints as MapFlowOverlayStyle['constraints'];
  }

  return out;
}

export function parseMapLayerStyle(style: unknown): MapLayerStyleRecord {
  if (!style || typeof style !== 'object') return {};
  const record = style as Record<string, unknown>;
  const layerKind = parseMapLayerKind(record.layerKind);
  return layerKind === MapLayerKind.STANDARD && record.layerKind === undefined
    ? {}
    : { layerKind };
}

export function parseMapObjectOverlayStyle(style: unknown): MapObjectStyleRecord {
  return parseMapFlowOverlayStyle(style);
}

export function inferMapLayerKind(layer: {
  name: string;
  style?: unknown;
}): MapLayerKindValue {
  const fromStyle = parseMapLayerStyle(layer.style).layerKind;
  if (fromStyle && fromStyle !== MapLayerKind.STANDARD) return fromStyle;
  const fromName = LAYER_NAME_TO_KIND[layer.name.trim()];
  if (fromName) return fromName;
  return MapLayerKind.STANDARD;
}

export function defaultSemanticRoleForLayer(
  layerKind: MapLayerKindValue,
  objectKind: string,
): MapObjectSemanticRoleValue {
  if (objectKind !== 'region' && objectKind !== 'path') {
    return MapObjectSemanticRole.REGION;
  }
  switch (layerKind) {
    case MapLayerKind.POLITICAL_BORDER:
      return MapObjectSemanticRole.POLITICAL_BORDER;
    case MapLayerKind.MIGRATION_FLOW:
      return MapObjectSemanticRole.MIGRATION_CORRIDOR;
    case MapLayerKind.TRADE_ROUTE:
      return MapObjectSemanticRole.TRADE_ROUTE;
    case MapLayerKind.TRAVEL_ROUTE:
      return MapObjectSemanticRole.TRAVEL_ROUTE;
    case MapLayerKind.WEATHER_OVERLAY:
      return MapObjectSemanticRole.WEATHER_BAND;
    default:
      return MapObjectSemanticRole.REGION;
  }
}

export function layerTemplateForKind(
  layerKind: MapLayerKindValue,
): { name: string; color: string } | null {
  switch (layerKind) {
    case MapLayerKind.POLITICAL_BORDER:
      return { name: POLITICAL_BORDERS_LAYER_NAME, color: POLITICAL_BORDERS_LAYER_COLOR };
    case MapLayerKind.MIGRATION_FLOW:
      return { name: MIGRATION_FLOWS_LAYER_NAME, color: MIGRATION_FLOWS_LAYER_COLOR };
    case MapLayerKind.TRADE_ROUTE:
      return { name: TRADE_ROUTES_LAYER_NAME, color: TRADE_ROUTES_LAYER_COLOR };
    case MapLayerKind.TRAVEL_ROUTE:
      return { name: TRAVEL_ROUTES_LAYER_NAME, color: TRAVEL_ROUTES_LAYER_COLOR };
    case MapLayerKind.WEATHER_OVERLAY:
      return { name: WEATHER_CLIMATE_LAYER_NAME, color: WEATHER_CLIMATE_LAYER_COLOR };
    default:
      return null;
  }
}

export function mergeObjectStyleWithOverlay(
  baseStyle: unknown,
  overlay: MapObjectStyleRecord,
): Record<string, unknown> {
  const base =
    baseStyle && typeof baseStyle === 'object'
      ? { ...(baseStyle as Record<string, unknown>) }
      : {};
  if (overlay.layerKind) base.layerKind = overlay.layerKind;
  if (overlay.semanticRole) base.semanticRole = overlay.semanticRole;
  if (overlay.controllingOrgPageId) {
    base.controllingOrgPageId = overlay.controllingOrgPageId;
  }
  if (overlay.territorySuggestion) {
    base.territorySuggestion = overlay.territorySuggestion;
  }
  if (overlay.overlayLifecycle) base.overlayLifecycle = overlay.overlayLifecycle;
  if (overlay.derivationStatus) base.derivationStatus = overlay.derivationStatus;
  if (overlay.sourceType) base.sourceType = overlay.sourceType;
  if (overlay.derivedFrom) base.derivedFrom = overlay.derivedFrom;
  if (overlay.generationVersion) base.generationVersion = overlay.generationVersion;
  if (overlay.confidence) base.confidence = overlay.confidence;
  if (overlay.idempotencyKey) base.idempotencyKey = overlay.idempotencyKey;
  if (overlay.overlayTemporal) base.overlayTemporal = overlay.overlayTemporal;
  if (overlay.flowKind) base.flowKind = overlay.flowKind;
  if (overlay.flowDirection) base.flowDirection = overlay.flowDirection;
  if (overlay.geoPath) base.geoPath = overlay.geoPath;
  if (overlay.constraints) base.constraints = overlay.constraints;
  if (overlay.ribbon) base.ribbon = overlay.ribbon;
  if (overlay.migrationWave) base.migrationWave = overlay.migrationWave;
  if (overlay.tradeRoute) base.tradeRoute = overlay.tradeRoute;
  if (overlay.weatherOverlay) base.weatherOverlay = overlay.weatherOverlay;
  return base;
}

export function layerKindBadgeLabel(kind: MapLayerKindValue): string | null {
  switch (kind) {
    case MapLayerKind.POLITICAL_BORDER:
      return 'Borders';
    case MapLayerKind.MIGRATION_FLOW:
      return 'Migration';
    case MapLayerKind.TRADE_ROUTE:
      return 'Trade';
    case MapLayerKind.TRAVEL_ROUTE:
      return 'Routes';
    case MapLayerKind.WEATHER_OVERLAY:
      return 'Weather';
    default:
      return null;
  }
}

export function isFlowPathOverlay(style: unknown): boolean {
  const parsed = parseMapFlowOverlayStyle(style);
  return Boolean(parsed.flowKind && parsed.ribbon);
}

export function isWeatherBandOverlay(style: unknown): boolean {
  const parsed = parseMapFlowOverlayStyle(style);
  return Boolean(parsed.weatherOverlay);
}
