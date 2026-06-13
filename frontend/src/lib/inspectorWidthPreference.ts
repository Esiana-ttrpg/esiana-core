export const INSPECTOR_WIDTH_STORAGE_KEY = 'entity-inspector-width-px';
export const INSPECTOR_WIDTH_EVENT = 'entity-inspector-width-changed';

export const INSPECTOR_WIDTH_DEFAULT = 520;
export const INSPECTOR_WIDTH_MIN = 400;
export const INSPECTOR_WIDTH_MAX = 640;

export function clampInspectorWidth(px: number): number {
  return Math.min(INSPECTOR_WIDTH_MAX, Math.max(INSPECTOR_WIDTH_MIN, Math.round(px)));
}

export function normalizeInspectorWidth(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed)) return INSPECTOR_WIDTH_DEFAULT;
  return clampInspectorWidth(parsed);
}

export function loadInspectorWidth(): number {
  if (typeof window === 'undefined') return INSPECTOR_WIDTH_DEFAULT;
  return normalizeInspectorWidth(window.localStorage.getItem(INSPECTOR_WIDTH_STORAGE_KEY));
}

export function saveInspectorWidth(px: number): void {
  if (typeof window === 'undefined') return;
  const clamped = clampInspectorWidth(px);
  window.localStorage.setItem(INSPECTOR_WIDTH_STORAGE_KEY, String(clamped));
  window.dispatchEvent(
    new CustomEvent<number>(INSPECTOR_WIDTH_EVENT, { detail: clamped }),
  );
}
