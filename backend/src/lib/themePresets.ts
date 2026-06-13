export const VALID_THEME_PRESETS = [
  'light',
  'dark',
  'auto',
  'fantasy',
  'cyberpunk',
  'parchment',
] as const;

export type ThemePreset = (typeof VALID_THEME_PRESETS)[number];

export const DEFAULT_THEME_PRESET: ThemePreset = 'dark';

export function sanitizeThemePreset(value: unknown): ThemePreset | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return (VALID_THEME_PRESETS as readonly string[]).includes(normalized)
    ? (normalized as ThemePreset)
    : undefined;
}
