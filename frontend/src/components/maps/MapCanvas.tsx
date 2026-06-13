import { useMemo, useState } from 'react';
import {
  MapContainer,
  ImageOverlay,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import '@/styles/leaflet-modern.css';
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
  campaignHandle: string;
  map: CampaignMapAsset;
  canEdit?: boolean;
  wikiPages?: { id: string; title: string }[];
  campaignMaps?: CampaignMapAsset[];
  className?: string;
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

function MapInteractionLayer({
  editMode,
  onQuickDrop,
}: {
  editMode: boolean;
  onQuickDrop: (x: number, y: number) => void;
}) {
  useMapEvents({
    dblclick(event) {
      if (!editMode) return;
      onQuickDrop(event.latlng.lng, event.latlng.lat);
    },
  });
  return null;
}

export function MapCanvas({
  campaignHandle,
  map,
  canEdit = false,
  wikiPages = [],
  campaignMaps = [],
  className = '',
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
  const [editingPin, setEditingPin] = useState<MapPinDto | null>(null);

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
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative min-h-[min(72vh,780px)] overflow-hidden rounded-xl border border-border bg-[#1a1a1a]">
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
          <div className="absolute right-3 top-3 z-[600]">
            <MapEditorToolbar
              editMode={editMode}
              ghostMode={ghostMode}
              editorTool={editorTool}
              onEditorToolChange={onEditorToolChange}
              onToggleEditMode={onToggleEditMode}
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
          style={{ height: 'min(72vh, 780px)', width: '100%', background: '#111' }}
          scrollWheelZoom
        >
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
            editMode={editMode && canEdit && editorTool === 'select'}
            onSelectObject={onSelectSceneObject}
          />
          {regionDrawOverlay}
          <MapInteractionLayer
            editMode={editMode && canEdit && editorTool === 'select'}
            onQuickDrop={(x, y) => setQuickDrop({ x, y })}
          />
          {visiblePins.map((pin) => {
            if (!pin.targetPageId && !pin.targetAssetId) {
              return null;
            }
            return (
              <MapPinMarker
                key={pin.id}
                pin={pin}
                campaignHandle={campaignHandle}
                draggable={editMode && canEdit}
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

      <ImageCreditDisplay credit={map.imageCredit} className="px-1" />

      {editMode && canEdit ? (
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
        open={Boolean(quickDrop)}
        x={quickDrop?.x ?? 0}
        y={quickDrop?.y ?? 0}
        wikiPages={wikiPages}
        campaignMaps={campaignMaps}
        currentAssetId={map.id}
        onClose={() => setQuickDrop(null)}
        onBindExisting={(pageId, pinType) => {
          if (!quickDrop) return;
          void handleCreatePin({
            x: quickDrop.x,
            y: quickDrop.y,
            targetPageId: pageId,
            pinType,
          }).then(() => setQuickDrop(null));
        }}
        onQuickCreate={(title, pinType) => {
          if (!quickDrop) return;
          void handleCreatePin({
            x: quickDrop.x,
            y: quickDrop.y,
            quickCreate: { title },
            pinType,
          }).then(() => setQuickDrop(null));
        }}
        onNestedMap={(targetAssetId, pinType) => {
          if (!quickDrop) return;
          void handleCreatePin({
            x: quickDrop.x,
            y: quickDrop.y,
            targetAssetId,
            pinType,
          }).then(() => setQuickDrop(null));
        }}
      />

      <MapPinEditorSheet
        open={Boolean(editingPin)}
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
        }}
        onDeleted={(pinId) => {
          setPins((current) => current.filter((entry) => entry.id !== pinId));
        }}
      />
    </div>
  );
}
