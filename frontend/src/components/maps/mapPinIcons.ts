import type { MapPinType } from '@/types/maps';
import {
  Castle,
  MapPin,
  Mountain,
  Scroll,
  Skull,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const PIN_TYPE_ICONS: Record<string, LucideIcon> = {
  Location: MapPin,
  Settlement: Castle,
  Ruin: Skull,
  Dungeon: Skull,
  Geography: Mountain,
  Quest: Scroll,
};

export function pinTypeIcon(pinType: string): LucideIcon {
  return PIN_TYPE_ICONS[pinType] ?? Star;
}

export function pinTypeColor(pinType: string, isSecret?: boolean): string {
  if (isSecret) return 'var(--color-accent, #a855f7)';
  switch (pinType) {
    case 'Settlement':
      return '#2563eb';
    case 'Ruin':
    case 'Dungeon':
      return '#dc2626';
    case 'Geography':
      return '#059669';
    case 'Quest':
      return '#d97706';
    default:
      return '#7c3aed';
  }
}

export function readPinTypeFilters(storageKey: string): Set<MapPinType> {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.filter(Boolean) as MapPinType[]);
  } catch {
    return new Set();
  }
}

export function writePinTypeFilters(
  storageKey: string,
  hiddenTypes: Set<MapPinType>,
): void {
  sessionStorage.setItem(storageKey, JSON.stringify([...hiddenTypes]));
}
