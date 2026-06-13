import { Polygon } from 'react-leaflet';
import { parsePolygonGeometry, normalizedRingToDisplay } from '@shared/mapGeometry';

interface MapFogLayerProps {
  geometries: unknown[];
  width: number;
  height: number;
}

export function MapFogLayer({ geometries, width, height }: MapFogLayerProps) {
  return (
    <>
      {geometries.map((geometry, index) => {
        const rings = parsePolygonGeometry(geometry);
        if (!rings?.[0]) return null;
        const positions = normalizedRingToDisplay(rings[0], width, height);
        return (
          <Polygon
            key={`fog-${index}`}
            positions={positions}
            pathOptions={{
              color: 'transparent',
              fillColor: '#0f172a',
              fillOpacity: 0.72,
              weight: 0,
              interactive: false,
            }}
          />
        );
      })}
    </>
  );
}
