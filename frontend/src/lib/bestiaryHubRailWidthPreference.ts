export const BESTIARY_HUB_RAIL_WIDTH_STORAGE_KEY = 'bestiary-hub-rail-width-px';
export const BESTIARY_HUB_RAIL_WIDTH_EVENT = 'bestiary-hub-rail-width-changed';

export const BESTIARY_HUB_RAIL_WIDTH_DEFAULT = 380;
export const BESTIARY_HUB_RAIL_WIDTH_MIN = 320;
export const BESTIARY_HUB_RAIL_WIDTH_MAX = 720;

export function clampBestiaryHubRailWidth(px: number): number {
  return Math.min(
    BESTIARY_HUB_RAIL_WIDTH_MAX,
    Math.max(BESTIARY_HUB_RAIL_WIDTH_MIN, Math.round(px)),
  );
}

export function loadBestiaryHubRailWidth(): number {
  if (typeof window === 'undefined') return BESTIARY_HUB_RAIL_WIDTH_DEFAULT;
  const raw = window.localStorage.getItem(BESTIARY_HUB_RAIL_WIDTH_STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed)) return BESTIARY_HUB_RAIL_WIDTH_DEFAULT;
  return clampBestiaryHubRailWidth(parsed);
}

export function saveBestiaryHubRailWidth(px: number): void {
  if (typeof window === 'undefined') return;
  const clamped = clampBestiaryHubRailWidth(px);
  window.localStorage.setItem(BESTIARY_HUB_RAIL_WIDTH_STORAGE_KEY, String(clamped));
  window.dispatchEvent(
    new CustomEvent<number>(BESTIARY_HUB_RAIL_WIDTH_EVENT, { detail: clamped }),
  );
}
