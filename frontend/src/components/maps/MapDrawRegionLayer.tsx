import { useEffect } from 'react';
import { Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import type { RegionDrawPhase } from '@/hooks/useMapRegionDraw';

interface MapDrawRegionLayerProps {
  phase: RegionDrawPhase;
  spaceHeld: boolean;
  previewLine: [number, number][];
  closedPreview: [number, number][] | null;
  onAddVertex: (x: number, y: number) => void;
  onUpdateCursor: (x: number, y: number, insideMap: boolean) => void;
  onClearCursor: () => void;
  onDoubleClickFinish: () => void;
}

export function MapDrawRegionLayer({
  phase,
  spaceHeld,
  previewLine,
  closedPreview,
  onAddVertex,
  onUpdateCursor,
  onClearCursor,
  onDoubleClickFinish,
}: MapDrawRegionLayerProps) {
  const map = useMap();

  useMapEvents({
    click(event) {
      if (phase !== 'drawing' || spaceHeld) return;
      onAddVertex(event.latlng.lng, event.latlng.lat);
    },
    dblclick(event) {
      if (phase !== 'drawing' || spaceHeld) return;
      event.originalEvent.preventDefault();
      onDoubleClickFinish();
    },
    mousemove(event) {
      if (phase !== 'drawing') return;
      onUpdateCursor(event.latlng.lng, event.latlng.lat, true);
    },
  });

  useMapEvents({
    mouseout() {
      onClearCursor();
    },
  });

  useEffect(() => {
    if (phase !== 'drawing') {
      map.dragging.enable();
      return;
    }
    if (spaceHeld) map.dragging.enable();
    else map.dragging.disable();
    return () => {
      map.dragging.enable();
    };
  }, [map, phase, spaceHeld]);

  if (phase !== 'drawing' && phase !== 'persisting') return null;

  return (
    <>
      {previewLine.length >= 2 ? (
        <Polyline
          positions={previewLine}
          pathOptions={{ color: '#fbbf24', weight: 2, dashArray: '4 4' }}
        />
      ) : null}
      {closedPreview ? (
        <Polygon
          positions={closedPreview}
          pathOptions={{
            color: '#fbbf24',
            weight: 2,
            fillColor: '#fbbf24',
            fillOpacity: 0.15,
          }}
        />
      ) : null}
    </>
  );
}
