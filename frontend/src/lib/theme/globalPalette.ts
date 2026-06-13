/**
 * Palette application helpers. Taxonomy and palette data live in appearancePresets.ts.
 */
import { extractCanvasHueBias } from './atmosphericDerivation';
import type { ThemeConfig } from './themeTypes';
import {
  getPaletteColorMode,
  GLOBAL_PALETTES,
  type GlobalPaletteId,
} from './appearancePresets';
import { resolveThemePreset } from './themeRegistry';
import type { ThemePresetId } from './themeTypes';

export {
  GLOBAL_BACKGROUND_TINT_STORAGE_KEY,
  GLOBAL_PALETTE_STORAGE_KEY,
  GLOBAL_PALETTE_TINTS_STORAGE_KEY,
} from './appearancePresets';
export * from './appearancePresets';

export interface ApplyPaletteOptions {
  applyBackgroundTint?: boolean;
}

export function applyPaletteToTheme(
  baseTheme: ThemeConfig,
  paletteId: GlobalPaletteId,
  _options: ApplyPaletteOptions = {},
): ThemeConfig {
  const palette = GLOBAL_PALETTES[paletteId];
  const merged: ThemeConfig = {
    ...baseTheme,
    primary: palette.primary,
    primaryHover: palette.primaryHover,
    accent: palette.accent,
  };

  const bias = extractCanvasHueBias(palette.bg);
  merged.canvasHueBias = bias.canvasHue;
  merged.warmthBias = bias.warmth;
  merged.saturationBias = bias.saturation;

  return merged;
}

export function resolvePaletteColorMode(preset: ThemePresetId) {
  const resolved = resolveThemePreset(preset);
  return resolved === 'light' || resolved === 'parchment' ? 'light' : 'dark';
}

export function getPaletteIdsForMode(mode: 'light' | 'dark'): readonly GlobalPaletteId[] {
  return mode === 'light'
    ? (['sunset', 'desert', 'arctic', 'trans', 'pride'] as const)
    : ([
        'ocean',
        'midnight',
        'forest',
        'ember',
        'deep_space',
        'halloween',
        'christmas',
      ] as const);
}

export function isPaletteCompatibleWithMode(
  paletteId: GlobalPaletteId,
  mode: 'light' | 'dark',
): boolean {
  return getPaletteColorMode(paletteId) === mode;
}

export function isPaletteCompatibleWithPreset(
  paletteId: GlobalPaletteId,
  preset: ThemePresetId,
): boolean {
  return isPaletteCompatibleWithMode(paletteId, resolvePaletteColorMode(preset));
}

export function getDefaultPaletteForMode(mode: 'light' | 'dark'): GlobalPaletteId {
  return mode === 'light' ? 'arctic' : 'ocean';
}

export function resolvePaletteForPreset(
  paletteId: GlobalPaletteId,
  preset: ThemePresetId,
): GlobalPaletteId {
  const mode = resolvePaletteColorMode(preset);
  if (isPaletteCompatibleWithMode(paletteId, mode)) return paletteId;
  return getDefaultPaletteForMode(mode);
}

/** @deprecated Use {@link Palette} from appearancePresets */
export type PaletteOverrides = import('./appearancePresets').Palette;
