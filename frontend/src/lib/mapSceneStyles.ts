import type { MapLayerDto, MapSceneObjectDto } from '@/types/maps';
import {
  inferMapLayerKind,
  isFlowPathOverlay,
  isWeatherBandOverlay,
  MapObjectSemanticRole,
  parseMapFlowOverlayStyle,
  parseMapObjectOverlayStyle,
} from '@shared/mapOverlayTypes';
import {
  computeFlowFieldSamples,
  deriveRibbonPolygon,
  parseLineStringGeometry,
  type FlowFieldSample,
} from '@shared/mapGeometry';

export type MapObjectStyle = {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWeight?: number;
  color?: string;
  fontSize?: number;
  preset?: 'circle' | 'square' | 'diamond';
  label?: string;
  isVisibilityZone?: boolean;
};

export type FlowRenderHints = {
  ribbonPolygon?: [number, number][];
  flowFieldSamples?: FlowFieldSample[];
};

export function parseObjectStyle(style: unknown): MapObjectStyle {
  if (!style || typeof style !== 'object') return {};
  return style as MapObjectStyle;
}

export function layerColorForObject(
  object: MapSceneObjectDto,
  layers: MapLayerDto[],
): string | null {
  if (!object.layerId) return null;
  return layers.find((l) => l.id === object.layerId)?.color ?? null;
}

export function regionPathOptions(
  object: MapSceneObjectDto,
  layers: MapLayerDto[],
): {
  color: string;
  weight: number;
  fillColor: string;
  fillOpacity: number;
  dashArray?: string;
} {
  const style = parseObjectStyle(object.style);
  const layerColor = layerColorForObject(object, layers);
  const overlay = parseMapObjectOverlayStyle(object.style);
  const flowOverlay = parseMapFlowOverlayStyle(object.style);
  const layerKind = object.layerId
    ? inferMapLayerKind({
        name: layers.find((l) => l.id === object.layerId)?.name ?? '',
      })
    : null;
  const isPolitical =
    overlay.semanticRole === MapObjectSemanticRole.POLITICAL_BORDER ||
    overlay.semanticRole === MapObjectSemanticRole.FRONTLINE ||
    overlay.semanticRole === MapObjectSemanticRole.CLAIM ||
    layerKind === 'political_border';
  const isWeather = isWeatherBandOverlay(object.style);

  const stroke = style.strokeColor ?? layerColor ?? '#c9a227';
  const fill = style.fillColor ?? layerColor ?? stroke;
  const weatherFillOpacity =
    flowOverlay.weatherOverlay?.intensity === 'severe'
      ? 0.35
      : flowOverlay.weatherOverlay?.intensity === 'low'
        ? 0.12
        : 0.22;
  return {
    color: stroke,
    weight: style.strokeWeight ?? (isPolitical ? 2.5 : 2),
    fillColor: fill,
    fillOpacity: style.fillOpacity ?? (isWeather ? weatherFillOpacity : isPolitical ? 0.15 : 0.2),
    dashArray: object.isGhostHidden
      ? '6 4'
      : isPolitical
        ? '8 4'
        : undefined,
  };
}

export function flowPathRenderHints(
  object: MapSceneObjectDto,
  width: number,
  height: number,
): FlowRenderHints | null {
  if (!isFlowPathOverlay(object.style)) return null;
  const line = parseLineStringGeometry(object.geometry);
  if (!line) return null;
  const flow = parseMapFlowOverlayStyle(object.style);
  const ribbon = flow.ribbon;
  if (!ribbon) return null;
  const ring = deriveRibbonPolygon(line, ribbon.baseWidth, ribbon.widthVariance ?? 0);
  if (ring.length < 3) return null;
  const ribbonPolygon = ring.map(([nx, ny]) => [ny * height, nx * width] as [number, number]);
  const flowFieldSamples = flow.flowDirection
    ? computeFlowFieldSamples(line, flow.flowDirection)
    : undefined;
  return { ribbonPolygon, flowFieldSamples };
}

export function flowRibbonPathOptions(
  object: MapSceneObjectDto,
  layers: MapLayerDto[],
): {
  color: string;
  weight: number;
  fillColor: string;
  fillOpacity: number;
  dashArray?: string;
} {
  const style = parseObjectStyle(object.style);
  const layerColor = layerColorForObject(object, layers);
  const flow = parseMapFlowOverlayStyle(object.style);
  const stroke = style.strokeColor ?? layerColor ?? '#94a3b8';
  return {
    color: stroke,
    weight: 1.5,
    fillColor: stroke,
    fillOpacity: flow.ribbon?.opacity ?? style.fillOpacity ?? 0.4,
    dashArray: object.isGhostHidden ? '6 4' : undefined,
  };
}
