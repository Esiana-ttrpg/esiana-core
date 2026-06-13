import type { ShelfDensityMode } from '@/types/hub';

export type ResolvedShelfDensity = 'cinematic' | 'shelf' | 'ledger';

const STORAGE_KEY = 'esiana.hub.shelfDensity';

export function loadShelfDensityPreference(): ShelfDensityMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'cinematic' || raw === 'shelf' || raw === 'ledger' || raw === 'auto') {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'auto';
}

export function saveShelfDensityPreference(mode: ShelfDensityMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function resolveShelfDensity(
  campaignCount: number,
  preference: ShelfDensityMode,
): ResolvedShelfDensity {
  if (preference !== 'auto') return preference;
  if (campaignCount <= 6) return 'cinematic';
  if (campaignCount <= 15) return 'shelf';
  return 'ledger';
}
