import { apiFetch } from './api';
import type {
  MapLayerDto,
  MapPinDto,
  MapSceneObjectDto,
  MapScenePayload,
} from '@/types/maps';
import {
  POLITICAL_BORDERS_LAYER_COLOR,
  POLITICAL_BORDERS_LAYER_NAME,
  MIGRATION_FLOWS_LAYER_COLOR,
  MIGRATION_FLOWS_LAYER_NAME,
  TRADE_ROUTES_LAYER_COLOR,
  TRADE_ROUTES_LAYER_NAME,
  TRAVEL_ROUTES_LAYER_COLOR,
  TRAVEL_ROUTES_LAYER_NAME,
  WEATHER_CLIMATE_LAYER_COLOR,
  WEATHER_CLIMATE_LAYER_NAME,
} from '@shared/mapOverlayTypes';

export type FetchMapSceneOptions = {
  viewEpochMinute?: string | null;
  layerIds?: string[];
  editorGhostMode?: boolean;
  debugPresence?: boolean;
};

export async function fetchMapScene(
  campaignHandle: string,
  assetId: string,
  options: FetchMapSceneOptions = {},
): Promise<MapScenePayload> {
  const params = new URLSearchParams();
  if (options.viewEpochMinute) {
    params.set('viewEpochMinute', options.viewEpochMinute);
  }
  if (options.layerIds?.length) {
    params.set('layerIds', options.layerIds.join(','));
  }
  if (options.editorGhostMode) params.set('editorGhostMode', '1');
  if (options.debugPresence) params.set('debugPresence', '1');

  const qs = params.toString();
  const data = await apiFetch<{ scene: MapScenePayload }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/scene${qs ? `?${qs}` : ''}`,
  );
  return data.scene;
}

export function sceneObjectToPinDto(object: MapSceneObjectDto): MapPinDto | null {
  if (object.kind !== 'pin' || !object.mapPinId) return null;
  return {
    id: object.mapPinId,
    x: object.x,
    y: object.y,
    label: object.label,
    pinType: object.pinType ?? 'Location',
    targetPageId: object.targetPageId,
    targetAssetId: object.targetAssetId,
    targetPageTitle: object.targetPageTitle,
    targetMapTitle: object.targetMapTitle,
    isSecret: object.isSecret,
    isGhostHidden: object.isGhostHidden,
    presenceReason: object.presenceReason,
    sceneObjectId: object.id,
  };
}

export function scenePinObjects(objects: MapSceneObjectDto[]): MapPinDto[] {
  return objects
    .map(sceneObjectToPinDto)
    .filter((pin): pin is MapPinDto => pin !== null);
}

export const VISIBILITY_ZONES_LAYER_NAME = 'Visibility zones';

export async function fetchMapPresentationPresets(
  campaignHandle: string,
  assetId: string,
): Promise<import('@/types/maps').MapPresentationPresetDto[]> {
  const data = await apiFetch<{ presets: import('@/types/maps').MapPresentationPresetDto[] }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/presentation-presets`,
  );
  return data.presets;
}

export async function createMapPresentationPreset(
  campaignHandle: string,
  assetId: string,
  input: {
    label: string;
    anchorEpochMinute: string;
    enabledLayerIds?: string[];
    sortOrder?: number;
  },
): Promise<import('@/types/maps').MapPresentationPresetDto> {
  const data = await apiFetch<{ preset: import('@/types/maps').MapPresentationPresetDto }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/presentation-presets`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return data.preset;
}

export async function updateMapPresentationPreset(
  campaignHandle: string,
  assetId: string,
  presetId: string,
  input: {
    label?: string;
    anchorEpochMinute?: string;
    enabledLayerIds?: string[];
    sortOrder?: number;
  },
): Promise<import('@/types/maps').MapPresentationPresetDto> {
  const data = await apiFetch<{ preset: import('@/types/maps').MapPresentationPresetDto }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/presentation-presets/${presetId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return data.preset;
}

export async function deleteMapPresentationPreset(
  campaignHandle: string,
  assetId: string,
  presetId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/maps/${assetId}/presentation-presets/${presetId}`, {
    method: 'DELETE',
  });
}

export async function fetchMapLayers(
  campaignHandle: string,
  assetId: string,
): Promise<MapLayerDto[]> {
  const data = await apiFetch<{ layers: MapLayerDto[] }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/layers`,
  );
  return data.layers;
}

export async function createMapObjectGroup(
  campaignHandle: string,
  assetId: string,
  input: { name: string; color?: string | null },
): Promise<import('@/types/maps').MapObjectGroupDto> {
  const data = await apiFetch<{ group: import('@/types/maps').MapObjectGroupDto }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/groups`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return data.group;
}

export async function createMapLayer(
  campaignHandle: string,
  assetId: string,
  input: { name: string; color?: string | null; defaultEnabled?: boolean },
): Promise<MapLayerDto> {
  const data = await apiFetch<{ layer: MapLayerDto }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/layers`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return data.layer;
}

export async function updateMapLayer(
  campaignHandle: string,
  assetId: string,
  layerId: string,
  input: { name?: string; color?: string | null; defaultEnabled?: boolean; sortOrder?: number },
): Promise<MapLayerDto> {
  const data = await apiFetch<{ layer: MapLayerDto }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/layers/${layerId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return data.layer;
}

export async function deleteMapLayer(
  campaignHandle: string,
  assetId: string,
  layerId: string,
): Promise<void> {
  await apiFetch(
    `/campaigns/${campaignHandle}/maps/${assetId}/layers/${layerId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function batchRevealMapObjects(
  campaignHandle: string,
  assetId: string,
  sceneObjectIds: string[],
): Promise<number> {
  const data = await apiFetch<{ revealed: number }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/reveal`,
    {
      method: 'POST',
      body: JSON.stringify({ sceneObjectIds }),
    },
  );
  return data.revealed;
}

export async function fetchWikiPageMapObjectImpact(
  campaignHandle: string,
  pageId: string,
): Promise<number> {
  const data = await apiFetch<{ linkedMapObjectCount: number }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/map-object-impact`,
  );
  return data.linkedMapObjectCount;
}

export function sceneOverlayObjects(objects: MapSceneObjectDto[]): MapSceneObjectDto[] {
  return objects.filter((o) => o.kind !== 'pin');
}

export async function createMapSceneObject(
  campaignHandle: string,
  assetId: string,
  input: Record<string, unknown>,
): Promise<{ id: string }> {
  const data = await apiFetch<{ object: { id: string } }>(
    `/campaigns/${campaignHandle}/maps/${assetId}/objects`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return data.object;
}

export async function updateMapSceneObject(
  campaignHandle: string,
  assetId: string,
  objectId: string,
  input: Record<string, unknown>,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/maps/${assetId}/objects/${objectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteMapSceneObject(
  campaignHandle: string,
  assetId: string,
  objectId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/maps/${assetId}/objects/${objectId}`, {
    method: 'DELETE',
  });
}

export interface MapObjectKeyframeSummaryDto {
  id: string;
  effectiveEpochMinute: string;
  hasGeometryOverride: boolean;
  hasStyleOverride: boolean;
  hasVisibilityOverride: boolean;
  hasRevelationOverride: boolean;
}

export async function fetchMapObjectKeyframes(
  campaignHandle: string,
  objectId: string,
): Promise<MapObjectKeyframeSummaryDto[]> {
  const data = await apiFetch<{ keyframes: MapObjectKeyframeSummaryDto[] }>(
    `/campaigns/${campaignHandle}/maps/objects/${objectId}/keyframes`,
  );
  return data.keyframes;
}

export async function createMapObjectKeyframe(
  campaignHandle: string,
  objectId: string,
  input: {
    effectiveEpochMinute: string;
    geometryOverride?: unknown;
    styleOverride?: unknown;
    visibilityOverride?: string;
    revelationOverride?: string;
  },
): Promise<{ id: string; effectiveEpochMinute: string }> {
  const data = await apiFetch<{
    keyframe: { id: string; effectiveEpochMinute: string };
  }>(`/campaigns/${campaignHandle}/maps/objects/${objectId}/keyframes`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.keyframe;
}

export async function deleteMapObjectKeyframe(
  campaignHandle: string,
  objectId: string,
  keyframeId: string,
): Promise<void> {
  await apiFetch(
    `/campaigns/${campaignHandle}/maps/objects/${objectId}/keyframes/${keyframeId}`,
    { method: 'DELETE' },
  );
}

export async function createVisibilityZonesLayer(
  campaignHandle: string,
  assetId: string,
): Promise<MapLayerDto> {
  return createMapLayer(campaignHandle, assetId, {
    name: VISIBILITY_ZONES_LAYER_NAME,
    color: '#64748b',
    defaultEnabled: true,
  });
}

/** Create a political-borders layer with standard name and color. */
export async function createPoliticalBordersLayer(
  campaignHandle: string,
  assetId: string,
): Promise<MapLayerDto> {
  return createMapLayer(campaignHandle, assetId, {
    name: POLITICAL_BORDERS_LAYER_NAME,
    color: POLITICAL_BORDERS_LAYER_COLOR,
    defaultEnabled: true,
  });
}

export async function createMigrationFlowsLayer(
  campaignHandle: string,
  assetId: string,
): Promise<MapLayerDto> {
  return createMapLayer(campaignHandle, assetId, {
    name: MIGRATION_FLOWS_LAYER_NAME,
    color: MIGRATION_FLOWS_LAYER_COLOR,
    defaultEnabled: true,
  });
}

export async function createTradeRoutesLayer(
  campaignHandle: string,
  assetId: string,
): Promise<MapLayerDto> {
  return createMapLayer(campaignHandle, assetId, {
    name: TRADE_ROUTES_LAYER_NAME,
    color: TRADE_ROUTES_LAYER_COLOR,
    defaultEnabled: true,
  });
}

export async function createTravelRoutesLayer(
  campaignHandle: string,
  assetId: string,
): Promise<MapLayerDto> {
  return createMapLayer(campaignHandle, assetId, {
    name: TRAVEL_ROUTES_LAYER_NAME,
    color: TRAVEL_ROUTES_LAYER_COLOR,
    defaultEnabled: true,
  });
}

export async function createWeatherClimateLayer(
  campaignHandle: string,
  assetId: string,
): Promise<MapLayerDto> {
  return createMapLayer(campaignHandle, assetId, {
    name: WEATHER_CLIMATE_LAYER_NAME,
    color: WEATHER_CLIMATE_LAYER_COLOR,
    defaultEnabled: true,
  });
}

export async function confirmMapFlowOverlay(
  campaignHandle: string,
  assetId: string,
  objectId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/maps/${assetId}/objects/${objectId}/confirm-flow`, {
    method: 'POST',
  });
}

export async function regenerateMapFlowOverlay(
  campaignHandle: string,
  assetId: string,
  objectId: string,
): Promise<void> {
  await updateMapSceneObject(campaignHandle, assetId, objectId, {
    regenerateFlowOverlay: true,
  });
}
