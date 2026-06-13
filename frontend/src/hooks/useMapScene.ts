import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MapLayerDto, MapObjectGroupDto, MapPinDto, MapPinType, MapPresentationPresetDto, MapSceneObjectDto } from '@/types/maps';
import { createMapPin, updateMapPin } from '@/lib/maps';
import {
  createMapLayer,
  createMigrationFlowsLayer,
  createPoliticalBordersLayer,
  createTradeRoutesLayer,
  createTravelRoutesLayer,
  createVisibilityZonesLayer,
  createWeatherClimateLayer,
  fetchMapScene,
  scenePinObjects,
  VISIBILITY_ZONES_LAYER_NAME,
} from '@/lib/mapScene';
import {
  MIGRATION_FLOWS_LAYER_NAME,
  POLITICAL_BORDERS_LAYER_NAME,
  TRADE_ROUTES_LAYER_NAME,
  TRAVEL_ROUTES_LAYER_NAME,
  WEATHER_CLIMATE_LAYER_NAME,
} from '@shared/mapOverlayTypes';
import { readPinTypeFilters, writePinTypeFilters } from '@/components/maps/mapPinIcons';

const GROUP_FILTER_PREFIX = 'esiana-map-hidden-groups:';

function readHiddenGroupIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function writeHiddenGroupIds(key: string, ids: Set<string>): void {
  localStorage.setItem(key, JSON.stringify([...ids]));
}

export interface UseMapSceneOptions {
  campaignHandle: string;
  mapAssetId: string;
  canEdit: boolean;
  viewEpochMinute: string | null;
  campaignEpochMinute: string | null;
  ghostMode: boolean;
  /** Party knowledge fog overlay (default on). */
  knowledgeFogEnabled?: boolean;
}

export function useMapScene({
  campaignHandle,
  mapAssetId,
  canEdit,
  viewEpochMinute,
  campaignEpochMinute,
  ghostMode,
  knowledgeFogEnabled = true,
}: UseMapSceneOptions) {
  const [sceneObjects, setSceneObjects] = useState<MapSceneObjectDto[]>([]);
  const [pins, setPins] = useState<MapPinDto[]>([]);
  const [layers, setLayers] = useState<MapLayerDto[]>([]);
  const [groups, setGroups] = useState<MapObjectGroupDto[]>([]);
  const [presentationPresets, setPresentationPresets] = useState<MapPresentationPresetDto[]>([]);
  const [activePresentationPresetAnchorEpoch, setActivePresentationPresetAnchorEpoch] =
    useState<string | null>(null);
  const [hiddenZoneGeometries, setHiddenZoneGeometries] = useState<unknown[]>([]);
  const [enabledLayerIds, setEnabledLayerIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = `esiana-map-filters:${campaignHandle}:${mapAssetId}`;
  const groupFilterKey = `${GROUP_FILTER_PREFIX}${campaignHandle}:${mapAssetId}`;
  const [hiddenTypes, setHiddenTypes] = useState(() => readPinTypeFilters(filterKey));
  const [hiddenGroupIds, setHiddenGroupIds] = useState(() =>
    readHiddenGroupIds(groupFilterKey),
  );

  const reloadScene = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scene = await fetchMapScene(campaignHandle, mapAssetId, {
        viewEpochMinute: viewEpochMinute ?? campaignEpochMinute,
        layerIds: enabledLayerIds.size > 0 ? [...enabledLayerIds] : undefined,
        editorGhostMode: ghostMode && canEdit,
        debugPresence: ghostMode && canEdit,
      });
      setLayers(scene.layers);
      setGroups(scene.groups ?? []);
      setSceneObjects(scene.objects);
      setPins(scenePinObjects(scene.objects));
      setPresentationPresets(scene.presentationPresets ?? []);
      setActivePresentationPresetAnchorEpoch(
        scene.activePresentationPresetAnchorEpoch ?? null,
      );
      setHiddenZoneGeometries(scene.hiddenZoneGeometries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load map');
    } finally {
      setLoading(false);
    }
  }, [
    campaignHandle,
    mapAssetId,
    viewEpochMinute,
    campaignEpochMinute,
    enabledLayerIds,
    ghostMode,
    canEdit,
  ]);

  useEffect(() => {
    void reloadScene();
  }, [reloadScene]);

  useEffect(() => {
    if (layers.length === 0) return;
    setEnabledLayerIds((current) => {
      if (current.size > 0) return current;
      return new Set(
        layers.filter((layer) => layer.defaultEnabled).map((layer) => layer.id),
      );
    });
  }, [layers]);

  const passesGroupFilter = useCallback(
    (object: { groupId: string | null }) =>
      !object.groupId || !hiddenGroupIds.has(object.groupId),
    [hiddenGroupIds],
  );

  const visibleSceneObjects = useMemo(
    () => sceneObjects.filter(passesGroupFilter),
    [sceneObjects, passesGroupFilter],
  );

  const visiblePins = useMemo(
    () =>
      pins.filter(
        (pin) =>
          !hiddenTypes.has(pin.pinType as MapPinType) &&
          passesGroupFilter({ groupId: pinGroupIdFromScene(sceneObjects, pin) }),
      ),
    [pins, hiddenTypes, passesGroupFilter, sceneObjects],
  );

  const togglePinType = useCallback(
    (pinType: MapPinType) => {
      setHiddenTypes((current) => {
        const next = new Set(current);
        if (next.has(pinType)) next.delete(pinType);
        else next.add(pinType);
        writePinTypeFilters(filterKey, next);
        return next;
      });
    },
    [filterKey],
  );

  const toggleGroupFilter = useCallback(
    (groupId: string) => {
      setHiddenGroupIds((current) => {
        const next = new Set(current);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        writeHiddenGroupIds(groupFilterKey, next);
        return next;
      });
    },
    [groupFilterKey],
  );

  const toggleLayer = useCallback((layerId: string) => {
    setEnabledLayerIds((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }, []);

  const enableAllLayers = useCallback(() => {
    setEnabledLayerIds(new Set(layers.map((layer) => layer.id)));
  }, [layers]);

  const disableAllLayers = useCallback(() => {
    setEnabledLayerIds(new Set());
  }, []);

  const handleCreateLayer = useCallback(async () => {
    const name = window.prompt('Layer name (e.g. Political borders)');
    if (!name?.trim()) return;
    await createMapLayer(campaignHandle, mapAssetId, { name: name.trim() });
    await reloadScene();
  }, [campaignHandle, mapAssetId, reloadScene]);

  const handleCreatePoliticalBordersLayer = useCallback(async () => {
    const exists = layers.some((l) => l.name.trim() === POLITICAL_BORDERS_LAYER_NAME);
    if (exists) {
      window.alert(`A "${POLITICAL_BORDERS_LAYER_NAME}" layer already exists.`);
      return;
    }
    await createPoliticalBordersLayer(campaignHandle, mapAssetId);
    await reloadScene();
  }, [campaignHandle, mapAssetId, layers, reloadScene]);

  const createNamedLayerIfMissing = useCallback(
    async (name: string, create: () => Promise<unknown>) => {
      const exists = layers.some((l) => l.name.trim() === name);
      if (exists) {
        window.alert(`A "${name}" layer already exists.`);
        return;
      }
      await create();
      await reloadScene();
    },
    [layers, reloadScene],
  );

  const handleCreateMigrationFlowsLayer = useCallback(async () => {
    await createNamedLayerIfMissing(MIGRATION_FLOWS_LAYER_NAME, () =>
      createMigrationFlowsLayer(campaignHandle, mapAssetId),
    );
  }, [campaignHandle, mapAssetId, createNamedLayerIfMissing]);

  const handleCreateTradeRoutesLayer = useCallback(async () => {
    await createNamedLayerIfMissing(TRADE_ROUTES_LAYER_NAME, () =>
      createTradeRoutesLayer(campaignHandle, mapAssetId),
    );
  }, [campaignHandle, mapAssetId, createNamedLayerIfMissing]);

  const handleCreateTravelRoutesLayer = useCallback(async () => {
    await createNamedLayerIfMissing(TRAVEL_ROUTES_LAYER_NAME, () =>
      createTravelRoutesLayer(campaignHandle, mapAssetId),
    );
  }, [campaignHandle, mapAssetId, createNamedLayerIfMissing]);

  const handleCreateWeatherClimateLayer = useCallback(async () => {
    await createNamedLayerIfMissing(WEATHER_CLIMATE_LAYER_NAME, () =>
      createWeatherClimateLayer(campaignHandle, mapAssetId),
    );
  }, [campaignHandle, mapAssetId, createNamedLayerIfMissing]);

  const handleCreateVisibilityZonesLayer = useCallback(async () => {
    await createNamedLayerIfMissing(VISIBILITY_ZONES_LAYER_NAME, () =>
      createVisibilityZonesLayer(campaignHandle, mapAssetId),
    );
  }, [campaignHandle, mapAssetId, createNamedLayerIfMissing]);

  const applyPresentationPreset = useCallback(
    (preset: MapPresentationPresetDto, onEpochChange: (epoch: string) => void) => {
      onEpochChange(preset.anchorEpochMinute);
      if (preset.enabledLayerIds.length > 0) {
        setEnabledLayerIds(new Set(preset.enabledLayerIds));
      }
    },
    [],
  );

  const activeEraPresetId = useMemo(() => {
    if (!activePresentationPresetAnchorEpoch) return null;
    const match = presentationPresets.find(
      (preset) => preset.anchorEpochMinute === activePresentationPresetAnchorEpoch,
    );
    return match?.id ?? null;
  }, [presentationPresets, activePresentationPresetAnchorEpoch]);

  const fogGeometries = useMemo(
    () => (knowledgeFogEnabled ? hiddenZoneGeometries : []),
    [hiddenZoneGeometries, knowledgeFogEnabled],
  );

  const handleDragEnd = useCallback(
    async (pin: MapPinDto, x: number, y: number) => {
      try {
        const updated = await updateMapPin(campaignHandle, mapAssetId, pin.id, { x, y });
        setPins((current) =>
          current.map((entry) => (entry.id === pin.id ? updated : entry)),
        );
      } catch {
        await reloadScene();
      }
    },
    [campaignHandle, mapAssetId, reloadScene],
  );

  const handleCreatePin = useCallback(
    async (input: {
      x: number;
      y: number;
      targetPageId?: string;
      targetAssetId?: string;
      quickCreate?: { title: string };
      pinType: MapPinType;
    }) => {
      const created = await createMapPin(campaignHandle, mapAssetId, input);
      setPins((current) => [...current, created]);
      await reloadScene();
      return created;
    },
    [campaignHandle, mapAssetId, reloadScene],
  );

  return {
    pins,
    setPins,
    sceneObjects,
    visibleSceneObjects,
    visiblePins,
    layers,
    groups,
    enabledLayerIds,
    hiddenTypes,
    hiddenGroupIds,
    loading,
    error,
    togglePinType,
    toggleGroupFilter,
    toggleLayer,
    enableAllLayers,
    disableAllLayers,
    handleCreateLayer,
    handleCreatePoliticalBordersLayer,
    handleCreateMigrationFlowsLayer,
    handleCreateTradeRoutesLayer,
    handleCreateTravelRoutesLayer,
    handleCreateWeatherClimateLayer,
    handleCreateVisibilityZonesLayer,
    applyPresentationPreset,
    presentationPresets,
    activePresentationPresetAnchorEpoch,
    activeEraPresetId,
    hiddenZoneGeometries: fogGeometries,
    setEnabledLayerIds,
    handleDragEnd,
    handleCreatePin,
    reloadScene,
  };
}

function pinGroupIdFromScene(
  objects: MapSceneObjectDto[],
  pin: MapPinDto,
): string | null {
  const sceneId = pin.sceneObjectId;
  if (sceneId) {
    return objects.find((o) => o.id === sceneId)?.groupId ?? null;
  }
  const match = objects.find((o) => o.mapPinId === pin.id);
  return match?.groupId ?? null;
}
