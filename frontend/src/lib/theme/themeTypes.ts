import type { GenreId, GlobalPaletteId, IdentityId } from './appearancePresets';

/** Built-in theme preset identifiers (campaign + global). */
export const THEME_PRESET_IDS = [
  'light',
  'dark',
  'auto',
  'fantasy',
  'cyberpunk',
  'parchment',
] as const;

export type ThemePresetId = (typeof THEME_PRESET_IDS)[number];

export const DEFAULT_THEME_PRESET: ThemePresetId = 'dark';

export interface ThemeDefinition {
  name: ThemePresetId;
  variables: Record<string, string>;
  pluginId: string;
}

export interface ThemeConfig {
  primary: string;
  primaryHover: string;
  bg: string;
  bgElevated: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Set at apply time — drives atmospheric role derivation */
  _derivationPreset?: Exclude<ThemePresetId, 'auto'>;
  /** Foundation palette — structural canvas and ecology authority */
  _paletteId?: GlobalPaletteId;
  /** Genre transform layer (behavioral, not slab recolor) */
  _genre?: Exclude<GenreId, 'none'>;
  /** Holiday / identity event overlay (modulation only) */
  _eventOverlay?: Exclude<IdentityId, 'none'>;
  /** Event overlay amplitude — capped by saturation budget overlayMax */
  _eventOverlayStrength?: number;
  /** Strength multiplier: 1.0 base, ~1.5 when background tint boost is on */
  _identityStrength?: number;
  /** Canvas hue bias from accent palette (degrees) */
  canvasHueBias?: number;
  warmthBias?: number;
  saturationBias?: number;
}
