import { useCallback, useMemo, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Lock } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MapPinDto, MapPinPreviewDto } from '@/types/maps';
import { pinTypeColor, pinTypeIcon } from './mapPinIcons';
import { MapPinPreviewCard } from './MapPinPreviewCard';
import { fetchMapPinPreview } from '@/lib/maps';

interface MapPinMarkerProps {
  pin: MapPinDto;
  campaignHandle: string;
  draggable?: boolean;
  editMode?: boolean;
  onDragEnd?: (pin: MapPinDto, x: number, y: number) => void;
  onEditPin?: (pin: MapPinDto) => void;
  onNavigateWiki?: (pageId: string) => void;
  onNavigateMap?: (assetId: string) => void;
}

function buildPinIcon(pin: MapPinDto): L.DivIcon {
  const Icon = pinTypeIcon(pin.pinType);
  const color = pinTypeColor(pin.pinType, pin.isSecret);
  const ghost = Boolean(pin.isGhostHidden);
  const opacity = ghost ? 0.35 : pin.isSecret ? 0.55 : 1;
  const border = ghost
    ? '2px dashed rgba(250,204,21,0.9)'
    : pin.isSecret
      ? '2px dashed rgba(255,255,255,0.85)'
      : '2px solid white';
  const html = renderToStaticMarkup(
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: '9999px',
        background: color,
        opacity,
        border,
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        color: 'white',
      }}
    >
      <Icon size={14} strokeWidth={2.25} aria-hidden />
      {pin.isSecret ? (
        <span
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            background: '#111827',
            borderRadius: '9999px',
            padding: 2,
            display: 'flex',
          }}
        >
          <Lock size={10} aria-hidden />
        </span>
      ) : null}
    </div>,
  );

  return L.divIcon({
    html,
    className: 'esiana-map-pin-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function stubPreviewFromPin(pin: MapPinDto): MapPinPreviewDto | null {
  const title = pin.targetPageTitle ?? pin.targetMapTitle ?? pin.label;
  if (!title) return null;
  return {
    title,
    excerpt: '',
    visibility: 'Party',
    wikiPageId: pin.targetPageId ?? '',
    targetAssetId: pin.targetAssetId,
    thumbnailUrl: null,
  };
}

export function MapPinMarker({
  pin,
  campaignHandle,
  draggable = false,
  editMode = false,
  onDragEnd,
  onEditPin,
  onNavigateWiki,
  onNavigateMap,
}: MapPinMarkerProps) {
  const stubPreview = useMemo(() => stubPreviewFromPin(pin), [pin]);
  const [preview, setPreview] = useState<MapPinPreviewDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const icon = useMemo(() => buildPinIcon(pin), [pin]);

  const loadPreview = useCallback(() => {
    if (loaded) return;
    setLoading(true);
    setError(null);
    void fetchMapPinPreview(campaignHandle, pin.id)
      .then((data) => {
        setPreview(data);
        setLoaded(true);
      })
      .catch(() => {
        setError(null);
        setLoaded(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [campaignHandle, pin.id, loaded]);

  const ghostTitle = pin.isGhostHidden && pin.presenceReason
    ? `Hidden: ${pin.presenceReason.replace(/_/g, ' ')}`
    : undefined;

  const displayPreview = preview ?? stubPreview;

  return (
    <Marker
      position={[pin.y, pin.x]}
      title={ghostTitle}
      icon={icon}
      draggable={draggable}
      eventHandlers={{
        dragend: (event) => {
          const latLng = event.target.getLatLng();
          onDragEnd?.(pin, latLng.lng, latLng.lat);
        },
        popupopen: loadPreview,
        click: () => {
          if (editMode && onEditPin) {
            onEditPin(pin);
            return;
          }
          if (pin.targetAssetId && onNavigateMap) {
            onNavigateMap(pin.targetAssetId);
            return;
          }
          if (pin.targetPageId && onNavigateWiki) {
            onNavigateWiki(pin.targetPageId);
          }
        },
      }}
    >
      <Popup>
        <MapPinPreviewCard
          preview={displayPreview}
          loading={loading && !displayPreview}
          error={error}
        />
      </Popup>
    </Marker>
  );
}
