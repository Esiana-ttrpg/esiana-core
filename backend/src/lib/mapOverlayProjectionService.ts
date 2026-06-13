/**
 * Layer 3 — persist derived map flow / weather overlays as MapSceneObjects.
 */

import type { Prisma } from '@prisma/client';
import {
  DerivationStatus,
  FlowKind,
  layerTemplateForKind,
  MAP_FLOW_GENERATION_VERSION,
  MapLayerKind,
  MapObjectSemanticRole,
  mergeObjectStyleWithOverlay,
  OverlayLifecycle,
  OverlaySourceType,
  parseMapFlowOverlayStyle,
  RibbonWidthUnit,
  type FlowKindValue,
  type MapLayerKindValue,
} from '../../../shared/mapOverlayTypes.js';
import {
  buildClimateIdempotencyKey,
  buildPathSpine,
  buildRouteIdempotencyKey,
  climateAspectsFromSingle,
  defaultFlowDirection,
  defaultRibbonForFlowKind,
  flowOverlayLabel,
  monthKeyFromCalendar,
} from '../../../shared/mapFlowDerivation.js';
import {
  convexHullPolygon,
  parsePointGeometry,
  type NormalizedPoint,
} from '../../../shared/mapGeometry.js';
import { convertEpochToCalendarState, parseMonths } from './timeEngine.js';
import { parseLocationMetadata } from './locationMetadata.js';

const MINUTES_PER_DAY = 24 * 60;

type DbClient = Prisma.TransactionClient | typeof import('./prisma.js').prisma;

export type FlowPathProjectionInput = {
  campaignId: string;
  mapAssetId: string;
  flowKind: FlowKindValue;
  originPageId: string;
  destinationPageId: string;
  derivedFrom: { type: string; sourceIds: string[]; batchId?: string };
  generatedAtEpoch: string;
  representsEpoch: string;
  label?: string;
  migrationWave?: {
    populationEstimate?: number;
    departureWindow?: { fromEpoch: string; untilEpoch?: string };
    arrivalWindow?: { fromEpoch: string; untilEpoch?: string };
  };
  tradeRoute?: { trafficWeight: number; economicSignal?: string };
  visibleFromEpochMinute?: bigint | null;
  visibleUntilEpochMinute?: bigint | null;
  confidence?: 'low' | 'medium' | 'high';
};

export type ClimateProjectionInput = {
  campaignId: string;
  mapAssetId: string;
  calendarId: string;
  regionKey: string;
  regionLabel: string;
  pinPoints: NormalizedPoint[];
  climateAspect: string;
  seasonName: string;
  monthIndex: number;
  monthName: string;
  generatedAtEpoch: string;
  representsEpoch: string;
  visibleFromEpochMinute: bigint;
  visibleUntilEpochMinute: bigint;
};

const LAYER_KIND_FOR_FLOW: Record<FlowKindValue, MapLayerKindValue> = {
  migration: MapLayerKind.MIGRATION_FLOW,
  trade: MapLayerKind.TRADE_ROUTE,
  travel: MapLayerKind.TRAVEL_ROUTE,
};

const SEMANTIC_FOR_FLOW: Record<FlowKindValue, string> = {
  migration: MapObjectSemanticRole.MIGRATION_CORRIDOR,
  trade: MapObjectSemanticRole.TRADE_ROUTE,
  travel: MapObjectSemanticRole.TRAVEL_ROUTE,
};

export async function resolvePinPointForPage(
  campaignId: string,
  mapAssetId: string,
  pageId: string,
  db: DbClient,
): Promise<NormalizedPoint | null> {
  const obj = await db.mapSceneObject.findFirst({
    where: {
      campaignId,
      mapAssetId,
      targetPageId: pageId,
      kind: 'pin',
    },
    select: { geometry: true },
  });
  if (!obj) return null;
  return parsePointGeometry(obj.geometry);
}

export async function findCommonMapForPages(
  campaignId: string,
  pageIds: string[],
  db: DbClient,
): Promise<{ mapAssetId: string; points: Map<string, NormalizedPoint> } | null> {
  if (pageIds.length < 2) return null;
  const unique = [...new Set(pageIds)];
  const pins = await db.mapSceneObject.findMany({
    where: {
      campaignId,
      targetPageId: { in: unique },
      kind: 'pin',
    },
    select: { mapAssetId: true, targetPageId: true, geometry: true },
  });

  const byMap = new Map<string, Map<string, NormalizedPoint>>();
  for (const pin of pins) {
    if (!pin.targetPageId) continue;
    const point = parsePointGeometry(pin.geometry);
    if (!point) continue;
    if (!byMap.has(pin.mapAssetId)) byMap.set(pin.mapAssetId, new Map());
    byMap.get(pin.mapAssetId)!.set(pin.targetPageId, point);
  }

  for (const [mapAssetId, pointMap] of byMap) {
    if (unique.every((id) => pointMap.has(id))) {
      return { mapAssetId, points: pointMap };
    }
  }
  return null;
}

async function ensureFlowLayer(
  campaignId: string,
  mapAssetId: string,
  layerKind: MapLayerKindValue,
  db: DbClient,
): Promise<string> {
  const template = layerTemplateForKind(layerKind);
  if (!template) throw new Error(`No layer template for ${layerKind}`);

  const existing = await db.mapLayer.findFirst({
    where: { campaignId, mapAssetId, name: template.name },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.mapLayer.create({
    data: {
      campaignId,
      mapAssetId,
      name: template.name,
      color: template.color,
      defaultEnabled: true,
      sortOrder: 50,
    },
  });
  return created.id;
}

async function findObjectByIdempotencyKey(
  campaignId: string,
  mapAssetId: string,
  idempotencyKey: string,
  db: DbClient,
) {
  const objects = await db.mapSceneObject.findMany({
    where: { campaignId, mapAssetId, kind: { in: ['path', 'region'] } },
    select: { id: true, style: true },
  });
  for (const obj of objects) {
    const style = parseMapFlowOverlayStyle(obj.style);
    if (style.idempotencyKey === idempotencyKey) return obj;
  }
  return null;
}

async function supersedeObject(
  objectId: string,
  db: DbClient,
): Promise<void> {
  const existing = await db.mapSceneObject.findUnique({
    where: { id: objectId },
    select: { style: true },
  });
  if (!existing) return;
  const nextStyle = mergeObjectStyleWithOverlay(existing.style ?? {}, {
    overlayLifecycle: OverlayLifecycle.SUPERSEDED,
    derivationStatus: DerivationStatus.STALE,
  });
  await db.mapSceneObject.update({
    where: { id: objectId },
    data: { style: nextStyle as never },
  });
}

export async function upsertFlowPathProjection(
  input: FlowPathProjectionInput,
  db: DbClient,
): Promise<{ objectId: string; created: boolean }> {
  const origin = await resolvePinPointForPage(
    input.campaignId,
    input.mapAssetId,
    input.originPageId,
    db,
  );
  const destination = await resolvePinPointForPage(
    input.campaignId,
    input.mapAssetId,
    input.destinationPageId,
    db,
  );
  if (!origin || !destination) {
    throw new Error('Origin and destination pins required on the same map');
  }

  const idempotencyKey = buildRouteIdempotencyKey({
    derivedFromType: input.derivedFrom.type,
    sourceIds: input.derivedFrom.sourceIds,
    mapAssetId: input.mapAssetId,
    flowKind: input.flowKind,
  });

  const existing = await findObjectByIdempotencyKey(
    input.campaignId,
    input.mapAssetId,
    idempotencyKey,
    db,
  );

  const layerKind = LAYER_KIND_FOR_FLOW[input.flowKind];
  const layerId = await ensureFlowLayer(
    input.campaignId,
    input.mapAssetId,
    layerKind,
    db,
  );

  const ribbonDefaults = defaultRibbonForFlowKind(input.flowKind);
  const geometry = buildPathSpine(origin, destination);
  const segmentCount = Math.max(1, geometry.coordinates.length - 1);

  const styleBase = mergeObjectStyleWithOverlay({}, {
    layerKind,
    semanticRole: SEMANTIC_FOR_FLOW[input.flowKind] as typeof MapObjectSemanticRole.MIGRATION_CORRIDOR,
    overlayLifecycle: OverlayLifecycle.DRAFT_GENERATED,
    derivationStatus: DerivationStatus.FRESH,
    sourceType: OverlaySourceType.DERIVED,
    derivedFrom: input.derivedFrom,
    generationVersion: MAP_FLOW_GENERATION_VERSION,
    confidence: input.confidence ?? 'medium',
    idempotencyKey,
    overlayTemporal: {
      generatedAtEpoch: input.generatedAtEpoch,
      representsEpoch: input.representsEpoch,
    },
    flowKind: input.flowKind,
    flowDirection: defaultFlowDirection(input.flowKind),
    geoPath: { segmentCosts: Array.from({ length: segmentCount }, () => ({})) },
    ribbon: {
      ...ribbonDefaults,
      widthUnit: RibbonWidthUnit.NORMALIZED_MAP_SPACE,
    },
    migrationWave:
      input.flowKind === FlowKind.MIGRATION
        ? {
            originPageId: input.originPageId,
            destinationPageId: input.destinationPageId,
            ...input.migrationWave,
          }
        : undefined,
    tradeRoute: input.flowKind === FlowKind.TRADE ? input.tradeRoute : undefined,
  });
  const style = {
    ...styleBase,
    strokeColor: layerTemplateForKind(layerKind)?.color,
    fillOpacity: ribbonDefaults.opacity,
  };

  if (existing) {
    const parsed = parseMapFlowOverlayStyle(existing.style);
    if (parsed.overlayLifecycle === OverlayLifecycle.SUPERSEDED) {
      // fall through to create new
    } else {
      await db.mapSceneObject.update({
        where: { id: existing.id },
        data: {
          geometry,
          style: style as never,
          revelation: 'DRAFT',
          visibleFromEpochMinute: input.visibleFromEpochMinute ?? null,
          visibleUntilEpochMinute: input.visibleUntilEpochMinute ?? null,
        },
      });
      return { objectId: existing.id, created: false };
    }
  }

  const created = await db.mapSceneObject.create({
    data: {
      campaignId: input.campaignId,
      mapAssetId: input.mapAssetId,
      layerId,
      kind: 'path',
      label: input.label ?? flowOverlayLabel(input.flowKind),
      visibility: 'Public',
      revelation: 'DRAFT',
      geometry,
      style: style as never,
      visibleFromEpochMinute: input.visibleFromEpochMinute ?? null,
      visibleUntilEpochMinute: input.visibleUntilEpochMinute ?? null,
    },
  });

  return { objectId: created.id, created: true };
}

export async function upsertClimateWeatherBand(
  input: ClimateProjectionInput,
  db: DbClient,
): Promise<{ objectId: string; created: boolean } | null> {
  const polygon = convexHullPolygon(input.pinPoints);
  if (!polygon) return null;

  const monthKey = monthKeyFromCalendar(input.monthIndex, input.monthName);
  const idempotencyKey = buildClimateIdempotencyKey({
    calendarId: input.calendarId,
    regionKey: input.regionKey,
    monthKey,
    representsEpoch: input.representsEpoch,
    mapAssetId: input.mapAssetId,
  });

  const existing = await findObjectByIdempotencyKey(
    input.campaignId,
    input.mapAssetId,
    idempotencyKey,
    db,
  );

  const layerId = await ensureFlowLayer(
    input.campaignId,
    input.mapAssetId,
    MapLayerKind.WEATHER_OVERLAY,
    db,
  );

  const styleBase = mergeObjectStyleWithOverlay({}, {
    layerKind: MapLayerKind.WEATHER_OVERLAY,
    semanticRole: MapObjectSemanticRole.WEATHER_BAND,
    overlayLifecycle: OverlayLifecycle.DRAFT_GENERATED,
    derivationStatus: DerivationStatus.FRESH,
    sourceType: OverlaySourceType.DERIVED,
    derivedFrom: {
      type: 'seasonal_climate_projection',
      sourceIds: [input.calendarId, input.regionKey, monthKey, input.seasonName],
    },
    generationVersion: MAP_FLOW_GENERATION_VERSION,
    confidence: 'high',
    idempotencyKey,
    overlayTemporal: {
      generatedAtEpoch: input.generatedAtEpoch,
      representsEpoch: input.representsEpoch,
    },
    weatherOverlay: {
      sourceMode: 'climate_projection',
      weatherMode: 'climate',
      climateAspects: climateAspectsFromSingle(input.climateAspect),
      seasonName: input.seasonName,
      intensity: 'moderate',
    },
  });
  const style = {
    ...styleBase,
    fillColor: layerTemplateForKind(MapLayerKind.WEATHER_OVERLAY)?.color,
    fillOpacity: 0.22,
  };

  if (existing) {
    const parsed = parseMapFlowOverlayStyle(existing.style);
    if (parsed.overlayLifecycle !== OverlayLifecycle.SUPERSEDED) {
      await db.mapSceneObject.update({
        where: { id: existing.id },
        data: {
          geometry: polygon,
          style: style as never,
          revelation: 'DRAFT',
          visibleFromEpochMinute: input.visibleFromEpochMinute,
          visibleUntilEpochMinute: input.visibleUntilEpochMinute,
        },
      });
      return { objectId: existing.id, created: false };
    }
    await supersedeObject(existing.id, db);
  }

  const created = await db.mapSceneObject.create({
    data: {
      campaignId: input.campaignId,
      mapAssetId: input.mapAssetId,
      layerId,
      kind: 'region',
      label: `${input.regionLabel} — ${input.monthName}`,
      visibility: 'Public',
      revelation: 'DRAFT',
      geometry: polygon,
      style: style as never,
      visibleFromEpochMinute: input.visibleFromEpochMinute,
      visibleUntilEpochMinute: input.visibleUntilEpochMinute,
    },
  });

  return { objectId: created.id, created: true };
}

export function estimateMonthEpochBounds(
  representsEpoch: bigint,
  calendar: import('./timeEngine.js').FantasyCalendarLike,
): { from: bigint; until: bigint } {
  const state = convertEpochToCalendarState(representsEpoch, calendar);
  const months = parseMonths(calendar.months);
  const month = months[state.monthIndex];
  const monthLength = month?.length ?? 30;
  const dayOffset = BigInt(Math.max(0, state.day - 1) * MINUTES_PER_DAY);
  const from = representsEpoch - dayOffset;
  const until = from + BigInt(monthLength * MINUTES_PER_DAY) - 1n;
  return { from, until };
}

export async function refreshClimateOverlaysForMap(
  campaignId: string,
  mapAssetId: string,
  viewEpochMinute: bigint,
  generatedAtEpoch: bigint,
  db: DbClient,
): Promise<number> {
  const calendar = await db.fantasyCalendar.findFirst({
    where: { campaignId },
    orderBy: { createdAt: 'asc' },
  });
  if (!calendar) return 0;

  const state = convertEpochToCalendarState(viewEpochMinute, calendar);
  const months = parseMonths(calendar.months);
  const month = months[state.monthIndex];
  const climateAspect = month?.climateAspect ?? 'NEUTRAL';
  const { from, until } = estimateMonthEpochBounds(viewEpochMinute, calendar);

  const pins = await db.mapSceneObject.findMany({
    where: { campaignId, mapAssetId, kind: 'pin', targetPageId: { not: null } },
    select: { targetPageId: true, geometry: true },
  });

  const regionClusters = new Map<string, { label: string; points: NormalizedPoint[] }>();

  for (const pin of pins) {
    if (!pin.targetPageId) continue;
    const point = parsePointGeometry(pin.geometry);
    if (!point) continue;

    const page = await db.wikiPage.findFirst({
      where: { id: pin.targetPageId, campaignId },
      select: { title: true, metadata: true },
    });
    if (!page) continue;

    const loc = parseLocationMetadata(page.metadata);
    const regionKey = loc.regionKey ?? loc.regionPageId ?? pin.targetPageId;
    const label = loc.region ?? page.title ?? regionKey;

    if (!regionClusters.has(regionKey)) {
      regionClusters.set(regionKey, { label, points: [] });
    }
    regionClusters.get(regionKey)!.points.push(point);
  }

  let count = 0;
  const representsEpoch = viewEpochMinute.toString();
  const generatedAt = generatedAtEpoch.toString();

  for (const [regionKey, cluster] of regionClusters) {
    if (cluster.points.length < 2) continue;
    const result = await upsertClimateWeatherBand(
      {
        campaignId,
        mapAssetId,
        calendarId: calendar.id,
        regionKey,
        regionLabel: cluster.label,
        pinPoints: cluster.points,
        climateAspect,
        seasonName: state.seasonName,
        monthIndex: state.monthIndex,
        monthName: state.monthName,
        generatedAtEpoch: generatedAt,
        representsEpoch,
        visibleFromEpochMinute: from,
        visibleUntilEpochMinute: until,
      },
      db,
    );
    if (result) count += 1;
  }

  return count;
}

export async function confirmFlowOverlay(
  campaignId: string,
  objectId: string,
  db: DbClient,
): Promise<boolean> {
  const obj = await db.mapSceneObject.findFirst({
    where: { id: objectId, campaignId },
    select: { style: true, revelation: true },
  });
  if (!obj) return false;
  const nextStyle = mergeObjectStyleWithOverlay(obj.style ?? {}, {
    overlayLifecycle: OverlayLifecycle.CONFIRMED,
    derivationStatus: DerivationStatus.FRESH,
  });
  await db.mapSceneObject.update({
    where: { id: objectId },
    data: {
      revelation: 'REVEALED',
      style: nextStyle as never,
    },
  });
  return true;
}

export async function markOverlayRecomputeRequired(
  campaignId: string,
  objectId: string,
  db: DbClient,
): Promise<void> {
  const obj = await db.mapSceneObject.findFirst({
    where: { id: objectId, campaignId },
    select: { style: true },
  });
  if (!obj) return;
  const nextStyle = mergeObjectStyleWithOverlay(obj.style ?? {}, {
    derivationStatus: DerivationStatus.RECOMPUTE_REQUIRED,
  });
  await db.mapSceneObject.update({
    where: { id: objectId },
    data: { style: nextStyle as never },
  });
}

export async function recomputeFlowOverlayIfNeeded(
  campaignId: string,
  objectId: string,
  generatedAtEpoch: string,
  db: DbClient,
): Promise<boolean> {
  const obj = await db.mapSceneObject.findFirst({
    where: { id: objectId, campaignId },
    select: {
      id: true,
      mapAssetId: true,
      style: true,
      visibleFromEpochMinute: true,
      visibleUntilEpochMinute: true,
    },
  });
  if (!obj) return false;
  const parsed = parseMapFlowOverlayStyle(obj.style);
  if (parsed.derivationStatus !== DerivationStatus.RECOMPUTE_REQUIRED) return false;

  if (parsed.weatherOverlay) {
    const represents = parsed.overlayTemporal?.representsEpoch;
    if (!represents) return false;
    await refreshClimateOverlaysForMap(
      campaignId,
      obj.mapAssetId,
      BigInt(represents),
      BigInt(generatedAtEpoch),
      db,
    );
    return true;
  }

  if (parsed.migrationWave && parsed.flowKind) {
    await upsertFlowPathProjection(
      {
        campaignId,
        mapAssetId: obj.mapAssetId,
        flowKind: parsed.flowKind,
        originPageId: parsed.migrationWave.originPageId,
        destinationPageId: parsed.migrationWave.destinationPageId,
        derivedFrom: parsed.derivedFrom ?? { type: 'recompute', sourceIds: [objectId] },
        generatedAtEpoch,
        representsEpoch: parsed.overlayTemporal?.representsEpoch ?? generatedAtEpoch,
        migrationWave: parsed.migrationWave,
        visibleFromEpochMinute: obj.visibleFromEpochMinute,
        visibleUntilEpochMinute: obj.visibleUntilEpochMinute,
      },
      db,
    );
    return true;
  }

  return false;
}

export async function resolveTradePartnerPageId(
  campaignId: string,
  sourcePageId: string,
  db: DbClient,
): Promise<string | null> {
  const page = await db.wikiPage.findFirst({
    where: { id: sourcePageId, campaignId },
    select: { metadata: true },
  });
  if (!page) return null;
  const loc = parseLocationMetadata(page.metadata);
  if (loc.relatedLocationIds.length > 0) return loc.relatedLocationIds[0] ?? null;
  if (loc.regionPageId && loc.regionPageId !== sourcePageId) return loc.regionPageId;
  return null;
}

export async function projectMigrationFromDisplacement(
  campaignId: string,
  effect: {
    id: string;
    characterPageId: string;
    fromLocationPageId?: string;
    toLocationPageId?: string;
  },
  atEpochMinute: string,
  db: DbClient,
): Promise<string | null> {
  const fromId = effect.fromLocationPageId;
  const toId = effect.toLocationPageId;
  if (!fromId || !toId) return null;

  const mapMatch = await findCommonMapForPages(campaignId, [fromId, toId], db);
  if (!mapMatch) return null;

  const result = await upsertFlowPathProjection(
    {
      campaignId,
      mapAssetId: mapMatch.mapAssetId,
      flowKind: FlowKind.MIGRATION,
      originPageId: fromId,
      destinationPageId: toId,
      derivedFrom: {
        type: 'displacement',
        sourceIds: [effect.id, effect.characterPageId, fromId, toId],
      },
      generatedAtEpoch: atEpochMinute,
      representsEpoch: atEpochMinute,
      migrationWave: {
        departureWindow: { fromEpoch: atEpochMinute },
      },
      confidence: 'medium',
    },
    db,
  );
  return result.objectId;
}

export async function projectTradeRouteFromEconomicSignal(
  campaignId: string,
  effect: {
    id: string;
    pageId: string;
    signal: string;
    trafficWeight?: number;
  },
  atEpochMinute: string,
  db: DbClient,
  destinationPageId?: string,
): Promise<string | null> {
  if (!destinationPageId) return null;
  const mapMatch = await findCommonMapForPages(
    campaignId,
    [effect.pageId, destinationPageId],
    db,
  );
  if (!mapMatch) return null;

  const result = await upsertFlowPathProjection(
    {
      campaignId,
      mapAssetId: mapMatch.mapAssetId,
      flowKind: FlowKind.TRADE,
      originPageId: effect.pageId,
      destinationPageId,
      derivedFrom: {
        type: 'economic_signal',
        sourceIds: [effect.id, effect.pageId, destinationPageId],
      },
      generatedAtEpoch: atEpochMinute,
      representsEpoch: atEpochMinute,
      tradeRoute: {
        trafficWeight:
          effect.trafficWeight ??
          (effect.signal === 'disruption' || effect.signal === 'trade_disruption'
            ? 0.3
            : 1),
        economicSignal: effect.signal,
      },
      confidence: 'medium',
    },
    db,
  );
  return result.objectId;
}

export async function projectTravelRouteFromLocationEvent(
  campaignId: string,
  effect: {
    id: string;
    characterPageId: string;
    locationPageId: string;
  },
  fromLocationPageId: string | null,
  atEpochMinute: string,
  db: DbClient,
): Promise<string | null> {
  if (!fromLocationPageId) return null;
  const mapMatch = await findCommonMapForPages(
    campaignId,
    [fromLocationPageId, effect.locationPageId],
    db,
  );
  if (!mapMatch) return null;

  const result = await upsertFlowPathProjection(
    {
      campaignId,
      mapAssetId: mapMatch.mapAssetId,
      flowKind: FlowKind.TRAVEL,
      originPageId: fromLocationPageId,
      destinationPageId: effect.locationPageId,
      derivedFrom: {
        type: 'append_location_event',
        sourceIds: [effect.id, effect.characterPageId, effect.locationPageId],
      },
      generatedAtEpoch: atEpochMinute,
      representsEpoch: atEpochMinute,
      confidence: 'low',
    },
    db,
  );
  return result.objectId;
}

export async function projectMigrationFromNpcMoves(
  campaignId: string,
  moves: Array<{ pageId: string; from: string | null; to: string | null }>,
  atEpochMinute: string,
  db: DbClient,
): Promise<number> {
  let count = 0;
  for (const move of moves) {
    if (!move.from || !move.to) continue;
    const id = await projectMigrationFromDisplacement(
      campaignId,
      {
        id: `snapshot:${move.pageId}`,
        characterPageId: move.pageId,
        fromLocationPageId: move.from,
        toLocationPageId: move.to,
      },
      atEpochMinute,
      db,
    );
    if (id) count += 1;
  }
  return count;
}
