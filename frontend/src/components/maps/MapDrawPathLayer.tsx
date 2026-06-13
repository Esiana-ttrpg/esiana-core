import { useEffect } from 'react';
import { Polyline, useMap, useMapEvents } from 'react-leaflet';
import type { PathDrawPhase } from '@/hooks/useMapPathDraw';

interface MapDrawPathLayerProps {
  phase: PathDrawPhase;
  spaceHeld: boolean;
  previewLine: [number, number][];
  onAddVertex: (x: number, y: number) => void;
  onUpdateCursor: (x: number, y: number, insideMap: boolean) => void;
  onClearCursor: () => void;
  onDoubleClickFinish: () => void;
}

export function MapDrawPathLayer({
  phase,
  spaceHeld,
  previewLine,
  onAddVertex,
  onUpdateCursor,
  onClearCursor,
  onDoubleClickFinish,
}: MapDrawPathLayerProps) {
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

  return previewLine.length >= 2 ? (
    <Polyline
      positions={previewLine}
      pathOptions={{ color: '#818cf8', weight: 3, dashArray: '6 4' }}
    />
  ) : null;
}
