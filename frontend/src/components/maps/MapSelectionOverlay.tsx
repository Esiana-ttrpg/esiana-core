import { useEffect, useMemo } from 'react';
import { CircleMarker, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { MapSceneObjectDto } from '@/types/maps';
import { parsePointGeometry, parsePolygonGeometry, parseLineStringGeometry, normalizedRingToDisplay } from '@shared/mapGeometry';

export function MapSelectionOverlay({ object, width, height, onInteractionChange }: { object?: MapSceneObjectDto | null; width: number; height: number; onInteractionChange?: (active: boolean) => void }) {
  const map = useMap();
  useMapEvents({ dragstart: () => onInteractionChange?.(true), dragend: () => onInteractionChange?.(false) });
  const geometry = useMemo(() => {
    if (!object) return null;
    const polygon = parsePolygonGeometry(object.geometry)?.[0];
    const line = parseLineStringGeometry(object.geometry);
    const point = parsePointGeometry(object.geometry);
    if (polygon) return { kind: 'polygon', positions: normalizedRingToDisplay(polygon, width, height) };
    if (line) return { kind: 'line', positions: normalizedRingToDisplay(line, width, height) };
    return { kind: 'point', positions: [point ? [point[1] * height, point[0] * width] as [number, number] : [object.y, object.x] as [number, number]] };
  }, [object, width, height]);
  useEffect(() => {
    if (!geometry) return;
    if (geometry.kind === 'point') map.panTo(geometry.positions[0], { animate: false });
    else map.fitBounds(L.latLngBounds(geometry.positions), { padding: [80, 80], maxZoom: map.getZoom(), animate: false });
    // Selection changes focus; property saves and presentation changes do not.
  }, [object?.id, map]);
  if (!geometry) return null;
  const pathOptions = { color: '#fbbf24', weight: 4, fillOpacity: 0, dashArray: '5 5' };
  if (geometry.kind === 'polygon') return <Polygon interactive={false} positions={geometry.positions} pathOptions={pathOptions} />;
  if (geometry.kind === 'line') return <Polyline interactive={false} positions={geometry.positions} pathOptions={pathOptions} />;
  return <CircleMarker interactive={false} center={geometry.positions[0]} radius={20} pathOptions={pathOptions} />;
}
