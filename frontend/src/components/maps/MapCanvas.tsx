import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  ImageOverlay,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import '@/styles/leaflet-modern.css';
import '@/styles/map-workspace.css';
import { MapSelectionOverlay } from './MapSelectionOverlay';
import type { MapDiscardGuard } from '@/hooks/useMapEditorDraft';
import type { CampaignMapAsset, MapPinDto } from '@/types/maps';
import { mapDisplayTitle } from '@/types/maps';
import { mapAssetImageUrl } from '@/lib/maps';
import type { useMapScene } from '@/hooks/useMapScene';
import { MapPinMarker } from './MapPinMarker';
import { MapPinQuickDropDialog } from './MapPinQuickDropDialog';
import { MapPinEditorSheet } from './MapPinEditorSheet';
import { MapEditorToolbar } from './MapEditorToolbar';
import { MapSceneObjectLayer } from './MapSceneObjectLayer';
import { MapFogLayer } from './MapFogLayer';
import type { MapEditorTool } from '@/types/maps';
import { Map } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PluginSlotHost } from '@/plugins/slots';
import { ImageCreditDisplay } from '@/components/media/ImageCreditDisplay';

interface MapCanvasProps {
  selectedObject?: import('@/types/maps').MapSceneObjectDto | null;
  editingObject?: import('@/types/maps').MapSceneObjectDto | null;
  onCloseProperties?: () => void;
  pinGuard?: MapDiscardGuard;
  onInteractionChange?: (active: boolean) => void;
  campaignHandle: string;
  map: CampaignMapAsset;
  canEdit?: boolean;
  wikiPages?: { id: string; title: string }[];
  campaignMaps?: CampaignMapAsset[];
  className?: string;
  fullscreen?: boolean;
  editMode: boolean;
  ghostMode: boolean;
  onToggleEditMode: () => void;
  onToggleGhostMode: () => void;
  scene: ReturnType<typeof useMapScene>;
  editorTool?: MapEditorTool;
  onEditorToolChange?: (tool: MapEditorTool) => void;
  onSelectSceneObject?: (object: import('@/types/maps').MapSceneObjectDto) => void;
  regionDrawOverlay?: React.ReactNode;
  onCancelDraw?: () => void;
  onFinishDraw?: () => void;
  canFinishDraw?: boolean;
  isPersistingDraw?: boolean;
  onNavigateWiki?: (pageId: string) => void;
  onNavigateMap?: (assetId: string, title?: string) => void;
}

function MapResizeSync({ fullscreen, bounds }: { fullscreen: boolean; bounds: L.LatLngBoundsExpression }) {
  const leafletMap = useMap();
  const container = leafletMap.getContainer().parentElement;
  const initialized = useRef(false);

  useEffect(() => {
    const invalidate = () => {
      if (!container?.clientWidth || !container.clientHeight) return;
      const center = leafletMap.getCenter();
      leafletMap.invalidateSize({ animate: false, pan: false });
      if (!initialized.current) {
        leafletMap.fitBounds(bounds, { animate: false });
        initialized.current = true;
      } else leafletMap.setView(center, leafletMap.getZoom(), { animate: false });
    };
    const frame = window.requestAnimationFrame(invalidate);
    const observer = container ? new ResizeObserver(invalidate) : null;
    if (observer && container) observer.observe(container);
    window.addEventListener('resize', invalidate);
    window.visualViewport?.addEventListener('resize', invalidate);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', invalidate);
      window.visualViewport?.removeEventListener('resize', invalidate);
    };
  }, [container, fullscreen, leafletMap, bounds]);

  return null;
}

function MapInteractionLayer({
  editMode,
  editingAvailable,
  placePin,
  onQuickDrop,
}: {
  editMode: boolean;
  editingAvailable: boolean;
  placePin: boolean;
  onQuickDrop: (x: number, y: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (editingAvailable) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
  }, [map, editingAvailable]);
  useMapEvents({
    click(event) {
      if (placePin) onQuickDrop(event.latlng.lng, event.latlng.lat);
    },
    dblclick(event) {
      if (!editMode) return;
      onQuickDrop(event.latlng.lng, event.latlng.lat);
    },
  });
  return null;
}

export function MapCanvas({
  selectedObject,
  editingObject,
  onCloseProperties,
  pinGuard,
  onInteractionChange,
  campaignHandle,
  map,
  canEdit = false,
  wikiPages = [],
  campaignMaps = [],
  className = '',
  fullscreen = false,
  editMode,
  ghostMode,
  onToggleEditMode,
  onToggleGhostMode,
  scene,
  editorTool = 'select',
  onEditorToolChange,
  onSelectSceneObject,
  regionDrawOverlay,
  onCancelDraw,
  onFinishDraw,
  canFinishDraw,
  isPersistingDraw,
  onNavigateWiki,
  onNavigateMap,
}: MapCanvasProps) {
  const {
    visiblePins,
    visibleSceneObjects,
    sceneObjects,
    layers,
    groups,
    hiddenZoneGeometries,
    loading,
    error,
    handleDragEnd,
    handleCreatePin,
    handleCreateLayer,
    handleCreatePoliticalBordersLayer,
    setPins,
  } = scene;

  const [quickDrop, setQuickDrop] = useState<{ x: number; y: number } | null>(null);
  const [quickDropError, setQuickDropError] = useState<string | null>(null);
  const [quickDropBusy, setQuickDropBusy] = useState(false);
  const persistPin = (input: Parameters<typeof handleCreatePin>[0]) => {
    if (!canEdit || !editMode || quickDropBusy) return;
    setQuickDropBusy(true);
    setQuickDropError(null);
    void handleCreatePin(input)
      .then(() => setQuickDrop(null))
      .catch(err => setQuickDropError(err instanceof Error ? err.message : 'Unable to create pin'))
      .finally(() => setQuickDropBusy(false));
  };
  useEffect(() => { setQuickDropError(null); }, [quickDrop]);
  const [localEditingPin, setLocalEditingPin] = useState<MapPinDto | null>(null);
  const localPinGuard = useRef<(() => boolean) | null>(null);
  const activePinGuard = pinGuard ?? localPinGuard;
  const editingPin = editingObject === undefined ? localEditingPin : visiblePins.find(pin => pin.sceneObjectId === editingObject?.id) ?? null;
  const setEditingPin = (pin: MapPinDto | null) => {
    if (editingObject === undefined) setLocalEditingPin(pin);
    else if (pin) {
      const object = sceneObjects.find(o => o.id === pin.sceneObjectId || o.mapPinId === pin.id);
      if (object) onSelectSceneObject?.(object);
    } else onCloseProperties?.();
  };
  useEffect(() => {
    if (!editMode || !canEdit) { setQuickDrop(null); setLocalEditingPin(null); }
  }, [editMode, canEdit]);

  const width = map.width ?? 1000;
  const height = map.height ?? 1000;
  const bounds = useMemo(
    (): L.LatLngBoundsExpression => [
      [0, 0],
      [height, width],
    ],
    [height, width],
  );

  const imageUrl = mapAssetImageUrl(map.id, 'display');
  const mapTitle = mapDisplayTitle(map);

  if (!map.width || !map.height) {
    return (
      <EmptyState
        icon={Map}
        title="Map dimensions unavailable"
        description="This map asset has not been processed yet. Re-upload the cartography file as type map."
      />
    );
  }

  return (
    <div className={`map-workspace ${editMode && editorTool !== 'select' ? 'map-drawing' : ''} flex min-h-0 flex-col ${fullscreen ? 'map-canvas-fullscreen gap-0' : 'gap-2'} ${className}`}>
      <div
        className={`relative overflow-hidden bg-[#1a1a1a] ${
          fullscreen
            ? 'h-full min-h-0 flex-1'
            : 'min-h-[min(72vh,780px)] rounded-xl border border-border'
        }`}
      >
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <LoadingSpinner />
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-x-0 top-0 z-10 bg-destructive/90 px-3 py-2 text-sm text-white">
            {error}
          </div>
        ) : null}

        {canEdit ? (
          <div className={fullscreen ? 'map-fullscreen-dock' : 'absolute right-3 top-3 z-[1100] max-w-[calc(100%_-_5rem)]'}>
            <MapEditorToolbar
              canEdit={canEdit}
              editMode={editMode}
              ghostMode={ghostMode}
              editorTool={editorTool}
              onEditorToolChange={onEditorToolChange}
              onToggleEditMode={() => {
                if (!pinGuard && editMode && !(activePinGuard.current?.() ?? true)) return;
                onToggleEditMode();
              }}
              onToggleGhostMode={onToggleGhostMode}
              onAddLayer={editMode ? () => void handleCreateLayer() : undefined}
              onAddPoliticalBordersLayer={
                editMode ? () => void handleCreatePoliticalBordersLayer() : undefined
              }
              onCancelDraw={onCancelDraw}
              onFinishDraw={onFinishDraw}
              canFinishDraw={canFinishDraw}
              isPersistingDraw={isPersistingDraw}
            />
          </div>
        ) : null}

        <PluginSlotHost
          slot="map:overlay"
          className="pointer-events-none absolute inset-0 z-[500]"
          context={{
            campaignHandle,
            config: {},
            map: {
              mapId: map.id,
              mapTitle,
              canEdit,
            },
          }}
        />

        <MapContainer
          crs={L.CRS.Simple}
          bounds={bounds}
          maxBounds={bounds}
          minZoom={-3}
          maxZoom={4}
          zoom={0}
          zoomSnap={0.25}
          zoomDelta={0.5}
          style={{
            height: fullscreen ? '100%' : 'min(72vh, 780px)',
            width: '100%',
            background: '#111',
          }}
          scrollWheelZoom
          zoomControl={false}
          doubleClickZoom={!editMode}
        >
          <ZoomControl position="bottomleft" />
          <MapResizeSync fullscreen={fullscreen} bounds={bounds} />
          <ImageOverlay url={imageUrl} bounds={bounds} />
          {hiddenZoneGeometries.length > 0 ? (
            <MapFogLayer
              geometries={hiddenZoneGeometries}
              width={width}
              height={height}
            />
          ) : null}
          <MapSceneObjectLayer
            objects={visibleSceneObjects}
            layers={layers}
            width={width}
            height={height}
            editMode={editorTool === 'select'}
            onSelectObject={onSelectSceneObject}
          />
          {regionDrawOverlay}
          <MapSelectionOverlay object={selectedObject} width={width} height={height} onInteractionChange={onInteractionChange} />
          <MapInteractionLayer
            editingAvailable={editMode && canEdit}
            placePin={editMode && canEdit && editorTool === 'placePin'}
            editMode={editMode && canEdit && editorTool === 'select'}
            onQuickDrop={(x, y) => { if (x >= 0 && y >= 0 && x <= width && y <= height) setQuickDrop({ x, y }); }}
          />
          {visiblePins.map((pin) => {
            if (!pin.targetPageId && !pin.targetAssetId) {
              return null;
            }
            return (
              <MapPinMarker
                key={pin.id}
                pin={pin}
                selected={selectedObject?.id === pin.sceneObjectId}
                onSelect={() => { const object = sceneObjects.find(o => o.id === pin.sceneObjectId); if (object) onSelectSceneObject?.(object); }}
                campaignHandle={campaignHandle}
                draggable={editMode && canEdit && editorTool === 'select'}
                editMode={editMode && canEdit}
                onDragEnd={handleDragEnd}
                onEditPin={setEditingPin}
                onNavigateWiki={onNavigateWiki}
                onNavigateMap={(assetId) => {
                  onNavigateMap?.(assetId, pin.targetMapTitle ?? undefined);
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {!fullscreen ? <ImageCreditDisplay credit={map.imageCredit} className="px-1" /> : null}

      {editMode && canEdit && !fullscreen ? (
        <p className="text-xs text-muted">
          {editorTool === 'select'
            ? 'Double-click to add a pin · click objects to edit · drag pins to move'
            : editorTool === 'drawRegion'
              ? 'Click vertices · double-click or Finish · Space+drag to pan · Esc to cancel'
              : editorTool === 'drawPath'
                ? 'Click path points (min 2) · double-click or Finish · Esc to cancel'
                : 'Click the map to place a label'}
        </p>
      ) : null}

      <MapPinQuickDropDialog
        error={quickDropError}
        busy={quickDropBusy}
        open={Boolean(quickDrop) && canEdit && editMode}
        x={quickDrop?.x ?? 0}
        y={quickDrop?.y ?? 0}
        wikiPages={wikiPages}
        campaignMaps={campaignMaps}
        currentAssetId={map.id}
        onClose={() => setQuickDrop(null)}
        onBindExisting={(pageId, pinType) => {
          if (!quickDrop) return;
          persistPin({
            x: quickDrop.x,
            y: quickDrop.y,
            targetPageId: pageId,
            pinType,
          });
        }}
        onQuickCreate={(title, pinType) => {
          if (!quickDrop) return;
          persistPin({
            x: quickDrop.x,
            y: quickDrop.y,
            quickCreate: { title },
            pinType,
          });
        }}
        onNestedMap={(targetAssetId, pinType) => {
          if (!quickDrop) return;
          persistPin({
            x: quickDrop.x,
            y: quickDrop.y,
            targetAssetId,
            pinType,
          });
        }}
      />

      <MapPinEditorSheet
        open={Boolean(editingPin) && canEdit && editMode}
        floating={fullscreen}
        guardRef={activePinGuard}
        pin={editingPin}
        campaignHandle={campaignHandle}
        assetId={map.id}
        wikiPages={wikiPages}
        campaignMaps={campaignMaps}
        groups={groups}
        sceneObjects={sceneObjects}
        onClose={() => setEditingPin(null)}
        onUpdated={(updated) => {
          setPins((current) =>
            current.map((entry) => (entry.id === updated.id ? updated : entry)),
          );
          void scene.reloadScene();
        }}
        onDeleted={(pinId) => {
          setPins((current) => current.filter((entry) => entry.id !== pinId));
        }}
      />
    </div>
  );
          void scene.reloadScene();
}
