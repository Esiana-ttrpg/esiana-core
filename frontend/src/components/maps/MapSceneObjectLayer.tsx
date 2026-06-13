import { useMemo } from 'react';
import { Marker, Polygon, Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { MapLayerDto, MapSceneObjectDto } from '@/types/maps';
import {
  parseLineStringGeometry,
  parsePointGeometry,
  parsePolygonGeometry,
  normalizedLineToDisplay,
  normalizedRingToDisplay,
} from '@shared/mapGeometry';
import { regionPathOptions, flowPathRenderHints, flowRibbonPathOptions, parseObjectStyle } from '@/lib/mapSceneStyles';
import { isFlowPathOverlay } from '@shared/mapOverlayTypes';

interface MapSceneObjectLayerProps {
  objects: MapSceneObjectDto[];
  layers: MapLayerDto[];
  width: number;
  height: number;
  editMode?: boolean;
  onSelectObject?: (object: MapSceneObjectDto) => void;
}

function MapRegionShape({
  object,
  layers,
  width,
  height,
  editMode,
  onSelect,
}: {
  object: MapSceneObjectDto;
  layers: MapLayerDto[];
  width: number;
  height: number;
  editMode?: boolean;
  onSelect?: () => void;
}) {
  const positions = useMemo(() => {
    const rings = parsePolygonGeometry(object.geometry);
    if (!rings?.[0]) return null;
    return normalizedRingToDisplay(rings[0], width, height);
  }, [object.geometry, width, height]);

  if (!positions || positions.length < 3) return null;

  const pathOptions = regionPathOptions(object, layers);

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        ...pathOptions,
        opacity: object.isGhostHidden ? 0.55 : 1,
      }}
      eventHandlers={
        editMode
          ? {
              click: () => onSelect?.(),
            }
          : undefined
      }
    />
  );
}

function MapPathShape({
  object,
  layers,
  width,
  height,
  editMode,
  onSelect,
}: {
  object: MapSceneObjectDto;
  layers: MapLayerDto[];
  width: number;
  height: number;
  editMode?: boolean;
  onSelect?: () => void;
}) {
  const positions = useMemo(() => {
    const line = parseLineStringGeometry(object.geometry);
    if (!line) return null;
    return normalizedLineToDisplay(line, width, height);
  }, [object.geometry, width, height]);

  if (!positions || positions.length < 2) return null;

  const flowHints = useMemo(
    () => flowPathRenderHints(object, width, height),
    [object, width, height],
  );
  const isFlow = isFlowPathOverlay(object.style);

  if (isFlow && flowHints?.ribbonPolygon && flowHints.ribbonPolygon.length >= 3) {
    const pathOptions = flowRibbonPathOptions(object, layers);
    return (
      <>
        <Polygon
          positions={flowHints.ribbonPolygon}
          pathOptions={{
            ...pathOptions,
            opacity: object.isGhostHidden ? 0.55 : 1,
          }}
          eventHandlers={
            editMode
              ? {
                  click: () => onSelect?.(),
                }
              : undefined
          }
        />
        <Polyline
          positions={positions}
          pathOptions={{
            color: pathOptions.color,
            weight: 1,
            dashArray: '4 6',
            opacity: 0.7,
          }}
        />
      </>
    );
  }

  const style = parseObjectStyle(object.style);
  const layerColor = layers.find((l) => l.id === object.layerId)?.color;

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: style.strokeColor ?? layerColor ?? '#94a3b8',
        weight: style.strokeWeight ?? 3,
        dashArray: object.isGhostHidden ? '6 4' : undefined,
        opacity: object.isGhostHidden ? 0.55 : 1,
      }}
      eventHandlers={
        editMode
          ? {
              click: () => onSelect?.(),
            }
          : undefined
      }
    />
  );
}

function MapLabelMarker({
  object,
  height,
  width,
  editMode,
  onSelect,
}: {
  object: MapSceneObjectDto;
  width: number;
  height: number;
  editMode?: boolean;
  onSelect?: () => void;
}) {
  const coords = parsePointGeometry(object.geometry);
  if (!coords) return null;

  const style = parseObjectStyle(object.style);
  const text = object.label?.trim() || 'Label';
  const fontSize = style.fontSize ?? 14;
  const color = style.color ?? '#f8fafc';

  const icon = L.divIcon({
    className: 'map-label-icon',
    html: `<span style="font-size:${fontSize}px;color:${color};font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.85);white-space:nowrap;pointer-events:auto;${object.isGhostHidden ? 'opacity:0.55;font-style:italic;' : ''}">${escapeHtml(text)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, fontSize / 2],
  });

  const [nx, ny] = coords;
  const position: [number, number] = [ny * height, nx * width];

  return (
    <Marker
      position={position}
      icon={icon}
      interactive={Boolean(editMode)}
      eventHandlers={
        editMode
          ? {
              click: () => onSelect?.(),
            }
          : undefined
      }
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function MapSceneObjectLayer({
  objects,
  layers,
  width,
  height,
  editMode = false,
  onSelectObject,
}: MapSceneObjectLayerProps) {
  const overlayObjects = useMemo(
    () => objects.filter((o) => o.kind !== 'pin'),
    [objects],
  );

  return (
    <>
      {overlayObjects.map((object) => {
        const onSelect = onSelectObject ? () => onSelectObject(object) : undefined;
        switch (object.kind) {
          case 'region':
            return (
              <MapRegionShape
                key={object.id}
                object={object}
                layers={layers}
                width={width}
                height={height}
                editMode={editMode}
                onSelect={onSelect}
              />
            );
          case 'path':
            return (
              <MapPathShape
                key={object.id}
                object={object}
                layers={layers}
                width={width}
                height={height}
                editMode={editMode}
                onSelect={onSelect}
              />
            );
          case 'label':
            return (
              <MapLabelMarker
                key={object.id}
                object={object}
                width={width}
                height={height}
                editMode={editMode}
                onSelect={onSelect}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
