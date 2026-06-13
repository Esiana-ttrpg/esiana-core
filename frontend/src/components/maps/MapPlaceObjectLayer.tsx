import { useMapEvents } from 'react-leaflet';
import { displayToNormalizedPoint, pointGeometry } from '@shared/mapPresence';
import { createMapSceneObject } from '@/lib/mapScene';
interface MapPlaceObjectLayerProps {
  width: number;
  height: number;
  campaignHandle: string;
  assetId: string;
  defaultLayerId: string | null;
  onPlaced: () => void | Promise<void>;
  onError: (message: string) => void;
}

export function MapPlaceObjectLayer({
  width,
  height,
  campaignHandle,
  assetId,
  defaultLayerId,
  onPlaced,
  onError,
}: MapPlaceObjectLayerProps) {
  useMapEvents({
    click(event) {
      const x = event.latlng.lng;
      const y = event.latlng.lat;
      const norm = displayToNormalizedPoint(x, y, width, height);

      const text = window.prompt('Label text');
      if (!text?.trim()) return;
      void createMapSceneObject(campaignHandle, assetId, {
        kind: 'label',
        x,
        y,
        geometry: pointGeometry(norm),
        label: text.trim(),
        layerId: defaultLayerId,
        revelation: 'REVEALED',
        style: { fontSize: 14, color: '#f8fafc' },
      })
        .then(() => onPlaced())
        .catch((err) =>
          onError(err instanceof Error ? err.message : 'Failed to place label'),
        );
    },
  });

  return null;
}
