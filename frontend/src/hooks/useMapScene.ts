import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const identity = `${campaignHandle}:${mapAssetId}`;
  const visibilityContext = `${identity}:${canEdit}:${ghostMode}:${viewEpochMinute ?? campaignEpochMinute}`;
  const [resolvedVisibilityContext, setResolvedVisibilityContext] = useState<string | null>(null);
  const [layerSelection, setLayerSelection] = useState<{ identity: string; ids: Set<string> | null }>({ identity, ids: null });
  const selection = layerSelection.identity === identity ? layerSelection.ids : null;
  const enabledLayerIds = useMemo(() => selection ?? new Set(layers.filter(l => l.defaultEnabled).map(l => l.id)), [selection, layers]);
  const setEnabledLayerIds = useCallback((update: Set<string> | ((ids: Set<string>) => Set<string>)) => {
    setLayerSelection(current => ({ identity, ids: typeof update === 'function' ? update(current.identity === identity && current.ids !== null ? current.ids : enabledLayerIds) : update }));
  }, [identity, enabledLayerIds]);
  const requestSequence = useRef(0);
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const currentVisibilityContext = useRef(visibilityContext);
  currentVisibilityContext.current = visibilityContext;
  const [hiddenAnnotationKinds, setHiddenAnnotationKinds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = `esiana-map-filters:${campaignHandle}:${mapAssetId}`;
  const groupFilterKey = `${GROUP_FILTER_PREFIX}${campaignHandle}:${mapAssetId}`;
  const [hiddenTypes, setHiddenTypes] = useState(() => readPinTypeFilters(filterKey));
  const [hiddenGroupIds, setHiddenGroupIds] = useState(() =>
    readHiddenGroupIds(groupFilterKey),
  );

  const reloadScene = useCallback(async () => {
    const request = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const scene = await fetchMapScene(campaignHandle, mapAssetId, {
        viewEpochMinute: viewEpochMinute ?? campaignEpochMinute,
        layerIds: selection === null ? undefined : [...selection],
        editorGhostMode: ghostMode && canEdit,
        debugPresence: ghostMode && canEdit,
      });
      if (request !== requestSequence.current || currentVisibilityContext.current !== visibilityContext) return;
      setResolvedVisibilityContext(visibilityContext);
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
      if (request !== requestSequence.current || currentIdentity.current !== identity) return;
      setError(err instanceof Error ? err.message : 'Unable to load map');
    } finally {
      if (request === requestSequence.current && currentIdentity.current === identity) setLoading(false);
    }
  }, [
    campaignHandle,
    mapAssetId,
    viewEpochMinute,
    campaignEpochMinute,
    selection,
    identity,
    visibilityContext,
    ghostMode,
    canEdit,
  ]);

  useEffect(() => {
    void reloadScene();
    return () => { requestSequence.current += 1; };
  }, [reloadScene]);

  useEffect(() => {
    setLayerSelection({ identity, ids: null });
    setLayers([]);
    setSceneObjects([]);
    setPins([]);
    setGroups([]);
    setPresentationPresets([]);
    setHiddenZoneGeometries([]);
    setHiddenTypes(readPinTypeFilters(filterKey));
    setHiddenGroupIds(readHiddenGroupIds(groupFilterKey));
    setHiddenAnnotationKinds(new Set());
  }, [filterKey, groupFilterKey, identity]);

  const passesGroupFilter = useCallback(
    (object: { groupId: string | null }) =>
      !canEdit || !object.groupId || !hiddenGroupIds.has(object.groupId),
    [hiddenGroupIds, canEdit],
  );

  const visibleSceneObjects = useMemo(
    () => resolvedVisibilityContext !== visibilityContext ? [] : sceneObjects.filter(object =>
      (!object.layerId || enabledLayerIds.has(object.layerId)) &&
      passesGroupFilter(object) &&
      !hiddenAnnotationKinds.has(object.kind) &&
      (object.kind !== 'pin' || !hiddenTypes.has(object.pinType as MapPinType))),
    [sceneObjects, passesGroupFilter, hiddenAnnotationKinds, hiddenTypes, enabledLayerIds, resolvedVisibilityContext, visibilityContext],
  );

  const visiblePins = useMemo(
    () =>
      pins.filter(
        (pin) =>
          !hiddenTypes.has(pin.pinType as MapPinType) &&
          visibleSceneObjects.some(object => object.mapPinId === pin.id) &&
          passesGroupFilter({ groupId: pinGroupIdFromScene(sceneObjects, pin) }),
      ),
    [pins, hiddenTypes, passesGroupFilter, sceneObjects, visibleSceneObjects],
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
  }, [setEnabledLayerIds]);

  const enableAllLayers = useCallback(() => {
    setEnabledLayerIds(new Set(layers.map((layer) => layer.id)));
  }, [layers, setEnabledLayerIds]);

  const disableAllLayers = useCallback(() => {
    setEnabledLayerIds(new Set());
  }, [setEnabledLayerIds]);

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
      setEnabledLayerIds(new Set(preset.enabledLayerIds));
    },
    [setEnabledLayerIds],
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
    hiddenAnnotationKinds,
    toggleAnnotationKind: (kind: string) => setHiddenAnnotationKinds(current => { const next = new Set(current); if (next.has(kind)) next.delete(kind); else next.add(kind); return next; }),
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
    loading: loading || (resolvedVisibilityContext !== visibilityContext && !error),
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
