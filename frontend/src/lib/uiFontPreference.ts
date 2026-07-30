export type UiFontPreference = 'default' | 'atkinson';

export const UI_FONT_STORAGE_KEY = 'esiana-ui-font';
export const UI_FONT_EVENT = 'esiana-ui-font-changed';

export function normalizeUiFontPreference(value: unknown): UiFontPreference {
  return value === 'atkinson' ? 'atkinson' : 'default';
}

export function getUiFontPreference(): UiFontPreference {
  if (typeof window === 'undefined') return 'default';
  return normalizeUiFontPreference(window.localStorage.getItem(UI_FONT_STORAGE_KEY));
}

export function applyUiFontPreference(value: UiFontPreference): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (value === 'atkinson') {
    root.setAttribute('data-ui-font', 'atkinson');
  } else {
    root.removeAttribute('data-ui-font');
  }
}

export function setUiFontPreference(value: UiFontPreference): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(UI_FONT_STORAGE_KEY, value);
  applyUiFontPreference(value);
  window.dispatchEvent(
    new CustomEvent<UiFontPreference>(UI_FONT_EVENT, { detail: value }),
  );
}
