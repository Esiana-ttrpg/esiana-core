export const VALID_GLOBAL_PALETTES = [
  'ocean',
  'midnight',
  'forest',
  'ember',
  'deep_space',
  'sunset',
  'desert',
  'arctic',
  'trans',
  'pride',
  'halloween',
  'christmas',
] as const;

export type GlobalPalette = (typeof VALID_GLOBAL_PALETTES)[number];

export const DEFAULT_GLOBAL_PALETTE: GlobalPalette = 'ocean';

const LEGACY_PALETTE_ALIASES: Record<string, GlobalPalette> = {
  'progress-pride': 'pride',
  progress_pride: 'pride',
};

export function sanitizeGlobalPalette(value: unknown): GlobalPalette | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if ((VALID_GLOBAL_PALETTES as readonly string[]).includes(normalized)) {
    return normalized as GlobalPalette;
  }
  return LEGACY_PALETTE_ALIASES[normalized];
}
