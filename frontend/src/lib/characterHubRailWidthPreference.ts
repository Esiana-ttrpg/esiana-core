export const CHARACTER_HUB_RAIL_WIDTH_STORAGE_KEY = 'character-hub-rail-width-px';
export const CHARACTER_HUB_RAIL_WIDTH_EVENT = 'character-hub-rail-width-changed';

export const CHARACTER_HUB_RAIL_WIDTH_DEFAULT = 380;
export const CHARACTER_HUB_RAIL_WIDTH_MIN = 320;
export const CHARACTER_HUB_RAIL_WIDTH_MAX = 720;

export function clampCharacterHubRailWidth(px: number): number {
  return Math.min(
    CHARACTER_HUB_RAIL_WIDTH_MAX,
    Math.max(CHARACTER_HUB_RAIL_WIDTH_MIN, Math.round(px)),
  );
}

export function normalizeCharacterHubRailWidth(value: unknown): number {
  const parsed =
    typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed)) return CHARACTER_HUB_RAIL_WIDTH_DEFAULT;
  return clampCharacterHubRailWidth(parsed);
}

export function loadCharacterHubRailWidth(): number {
  if (typeof window === 'undefined') return CHARACTER_HUB_RAIL_WIDTH_DEFAULT;
  return normalizeCharacterHubRailWidth(
    window.localStorage.getItem(CHARACTER_HUB_RAIL_WIDTH_STORAGE_KEY),
  );
}

export function saveCharacterHubRailWidth(px: number): void {
  if (typeof window === 'undefined') return;
  const clamped = clampCharacterHubRailWidth(px);
  window.localStorage.setItem(CHARACTER_HUB_RAIL_WIDTH_STORAGE_KEY, String(clamped));
  window.dispatchEvent(
    new CustomEvent<number>(CHARACTER_HUB_RAIL_WIDTH_EVENT, { detail: clamped }),
  );
}
