import type { ThemePresetId } from './themeTypes';

/** Accent + mode-appropriate neutral environment tokens. */
export interface Palette {
  primary: string;
  primaryHover: string;
  accent: string;
  bg: string;
  surface: string;
  border: string;
}

export type FoundationId = 'light' | 'dark';
export type GenreId = 'none' | 'fantasy' | 'cyberpunk' | 'parchment';

export const GENRE_IDS = ['fantasy', 'cyberpunk', 'parchment'] as const;

export function isGenreId(value: string): value is (typeof GENRE_IDS)[number] {
  return (GENRE_IDS as readonly string[]).includes(value);
}
export type IdentityId = 'none' | 'trans' | 'pride' | 'halloween' | 'christmas';

export type DarkFoundationPaletteId =
  | 'ocean'
  | 'midnight'
  | 'forest'
  | 'ember'
  | 'deep_space';

export type LightFoundationPaletteId = 'sunset' | 'desert' | 'arctic';

export type HolidayPaletteId = 'trans' | 'pride' | 'halloween' | 'christmas';

export type FoundationPaletteId = DarkFoundationPaletteId | LightFoundationPaletteId;

export type GlobalPaletteId = FoundationPaletteId | HolidayPaletteId;

export const DARK_FOUNDATION_PALETTE_IDS = [
  'ocean',
  'midnight',
  'forest',
  'ember',
  'deep_space',
] as const satisfies readonly DarkFoundationPaletteId[];

export const LIGHT_FOUNDATION_PALETTE_IDS = [
  'sunset',
  'desert',
  'arctic',
] as const satisfies readonly LightFoundationPaletteId[];

export const HOLIDAY_PALETTE_IDS = [
  'trans',
  'pride',
  'halloween',
  'christmas',
] as const satisfies readonly HolidayPaletteId[];

export const GLOBAL_PALETTE_IDS = [
  ...DARK_FOUNDATION_PALETTE_IDS,
  ...LIGHT_FOUNDATION_PALETTE_IDS,
  ...HOLIDAY_PALETTE_IDS,
] as const;

export type PaletteColorMode = 'light' | 'dark';

export const DEFAULT_DARK_PALETTE: DarkFoundationPaletteId = 'ocean';
export const DEFAULT_LIGHT_PALETTE: LightFoundationPaletteId = 'arctic';
export const DEFAULT_GLOBAL_PALETTE: GlobalPaletteId = DEFAULT_DARK_PALETTE;

export const GLOBAL_PALETTE_STORAGE_KEY = 'esiana-global-palette';
/** @deprecated Use {@link GLOBAL_BACKGROUND_TINT_STORAGE_KEY} */
export const GLOBAL_PALETTE_TINTS_STORAGE_KEY = 'esiana-global-palette-apply-tints';
export const GLOBAL_BACKGROUND_TINT_STORAGE_KEY = 'esiana-apply-background-tint';

/**
 * Taxonomy for admin appearance UI — loop keys to render sectioned controls.
 */
export const APPEARANCE_PRESETS = {
  foundation: {
    light: {
      label: 'Light',
      description: 'Bright surfaces and high-contrast typography for daytime use.',
      preset: 'light' as const satisfies ThemePresetId,
      defaultPalette: 'arctic' as const satisfies LightFoundationPaletteId,
      palettes: LIGHT_FOUNDATION_PALETTE_IDS,
      mode: 'light' as const satisfies PaletteColorMode,
    },
    dark: {
      label: 'Dark',
      description: 'Low-glare backgrounds suited to evening play sessions.',
      preset: 'dark' as const satisfies ThemePresetId,
      defaultPalette: 'ocean' as const satisfies DarkFoundationPaletteId,
      palettes: DARK_FOUNDATION_PALETTE_IDS,
      mode: 'dark' as const satisfies PaletteColorMode,
    },
  },
  genre: {
    fantasy: {
      label: 'Fantasy',
      description: 'Arcane purples and parchment warmth — serif-friendly campaign vibe.',
      preset: 'fantasy' as const satisfies ThemePresetId,
      mode: 'dark' as const satisfies PaletteColorMode,
    },
    cyberpunk: {
      label: 'Cyberpunk',
      description: 'Neon cyan and magenta on deep void — sharp sans-serif energy.',
      preset: 'cyberpunk' as const satisfies ThemePresetId,
      mode: 'dark' as const satisfies PaletteColorMode,
    },
    parchment: {
      label: 'Parchment',
      description:
        'Warm paper grain, sepia ink, and Garamond serifs — ideal for lore-heavy campaigns.',
      preset: 'parchment' as const satisfies ThemePresetId,
      mode: 'light' as const satisfies PaletteColorMode,
      fontFamily: "'Garamond', 'Georgia', serif",
    },
  },
  holiday: {
    trans: {
      label: 'Trans',
      description: 'Flag blues and pinks on a soft sky-tinted canvas.',
      palette: 'trans' as const satisfies HolidayPaletteId,
      mode: 'light' as const satisfies PaletteColorMode,
    },
    pride: {
      label: 'Progress Pride',
      description: 'Rainbow accents with a clean, airy neutral base.',
      palette: 'pride' as const satisfies HolidayPaletteId,
      mode: 'light' as const satisfies PaletteColorMode,
    },
    halloween: {
      label: 'Halloween',
      description: 'Pumpkin orange and witch-purple on a muted charcoal base.',
      palette: 'halloween' as const satisfies HolidayPaletteId,
      mode: 'dark' as const satisfies PaletteColorMode,
    },
    christmas: {
      label: 'Christmas',
      description: 'Evergreen and cranberry highlights on a cozy dark green base.',
      palette: 'christmas' as const satisfies HolidayPaletteId,
      mode: 'dark' as const satisfies PaletteColorMode,
    },
  },
} as const;

export type AppearancePresetCategory = keyof typeof APPEARANCE_PRESETS;

export const PALETTE_DISPLAY_NAMES: Record<GlobalPaletteId, string> = {
  ocean: 'Ocean',
  midnight: 'Midnight',
  forest: 'Forest',
  ember: 'Ember',
  deep_space: 'Deep Space',
  sunset: 'Sunset',
  desert: 'Desert',
  arctic: 'Arctic',
  trans: 'Trans',
  pride: 'Progress Pride',
  halloween: 'Halloween',
  christmas: 'Christmas',
};

const FOUNDATION_PALETTES: Record<FoundationPaletteId, Palette> = {
  ocean: {
    primary: '#38bdf8',
    primaryHover: '#0ea5e9',
    accent: '#67e8f9',
    bg: '#13171b',
    surface: '#1b2127',
    border: '#2a333c',
  },
  midnight: {
    primary: '#a78bfa',
    primaryHover: '#8b5cf6',
    accent: '#c4b5fd',
    bg: '#141416',
    surface: '#1c1c21',
    border: '#2b2b33',
  },
  forest: {
    primary: '#4ade80',
    primaryHover: '#22c55e',
    accent: '#86efac',
    bg: '#141614',
    surface: '#1c211c',
    border: '#2a332b',
  },
  ember: {
    primary: '#fb923c',
    primaryHover: '#f97316',
    accent: '#fdba74',
    bg: '#171514',
    surface: '#201d1a',
    border: '#332e2a',
  },
  deep_space: {
    primary: '#a5b4fc',
    primaryHover: '#818cf8',
    accent: '#c4b5fd',
    bg: '#06070c',
    surface: '#0c0e16',
    border: '#1a1d2b',
  },
  sunset: {
    primary: '#ea580c',
    primaryHover: '#c2410c',
    accent: '#f97316',
    bg: '#faf5f3',
    surface: '#fff8f5',
    border: '#e8d5cf',
  },
  desert: {
    primary: '#a67c52',
    primaryHover: '#8b6544',
    accent: '#c2956a',
    bg: '#faf7f2',
    surface: '#fffdf9',
    border: '#e0d6c8',
  },
  arctic: {
    primary: '#0284c7',
    primaryHover: '#0369a1',
    accent: '#38bdf8',
    bg: '#f4f9fb',
    surface: '#f8fcfe',
    border: '#d0e3ed',
  },
};

const HOLIDAY_PALETTES: Record<HolidayPaletteId, Palette> = {
  trans: {
    primary: '#5BCEFA',
    primaryHover: '#3bb8e8',
    accent: '#F7A8B8',
    bg: '#f2f9fc',
    surface: '#fafefe',
    border: '#cce4ef',
  },
  pride: {
    primary: '#E40303',
    primaryHover: '#c70202',
    accent: '#FF8C00',
    bg: '#faf8fb',
    surface: '#ffffff',
    border: '#e4dfe8',
  },
  halloween: {
    primary: '#f97316',
    primaryHover: '#ea580c',
    accent: '#a855f7',
    bg: '#141214',
    surface: '#1c181c',
    border: '#3d2e4a',
  },
  christmas: {
    primary: '#dc2626',
    primaryHover: '#b91c1c',
    accent: '#16a34a',
    bg: '#101614',
    surface: '#162019',
    border: '#2a3d30',
  },
};

export const GLOBAL_PALETTES: Record<GlobalPaletteId, Palette> = {
  ...FOUNDATION_PALETTES,
  ...HOLIDAY_PALETTES,
};

export const DarkPalettes = Object.fromEntries(
  DARK_FOUNDATION_PALETTE_IDS.map((id) => [id, GLOBAL_PALETTES[id]]),
) as Record<DarkFoundationPaletteId, Palette>;
export const LightPalettes = Object.fromEntries(
  LIGHT_FOUNDATION_PALETTE_IDS.map((id) => [id, GLOBAL_PALETTES[id]]),
) as Record<LightFoundationPaletteId, Palette>;

const PALETTE_MODE_BY_ID: Record<GlobalPaletteId, PaletteColorMode> = {
  ...Object.fromEntries(
    DARK_FOUNDATION_PALETTE_IDS.map((id) => [id, 'dark' as const]),
  ),
  ...Object.fromEntries(
    LIGHT_FOUNDATION_PALETTE_IDS.map((id) => [id, 'light' as const]),
  ),
  ...Object.fromEntries(
    HOLIDAY_PALETTE_IDS.map((id) => [
      id,
      APPEARANCE_PRESETS.holiday[id].mode,
    ]),
  ),
} as Record<GlobalPaletteId, PaletteColorMode>;

const LEGACY_PALETTE_ALIASES: Record<string, GlobalPaletteId> = {
  'progress-pride': 'pride',
  progress_pride: 'pride',
};

export function isGlobalPaletteId(value: string): value is GlobalPaletteId {
  return (GLOBAL_PALETTE_IDS as readonly string[]).includes(value);
}

export function isHolidayPaletteId(value: string): value is HolidayPaletteId {
  return (HOLIDAY_PALETTE_IDS as readonly string[]).includes(value);
}

export function isFoundationPaletteId(
  value: string,
): value is FoundationPaletteId {
  return isGlobalPaletteId(value) && !isHolidayPaletteId(value);
}

export function resolveGlobalPaletteId(value: string): GlobalPaletteId | undefined {
  const normalized = value.trim().toLowerCase();
  if (isGlobalPaletteId(normalized)) return normalized;
  return LEGACY_PALETTE_ALIASES[normalized];
}

export function getPaletteColorMode(paletteId: GlobalPaletteId): PaletteColorMode {
  return PALETTE_MODE_BY_ID[paletteId];
}

export function getFoundationPalettesForMode(
  foundation: FoundationId,
): readonly FoundationPaletteId[] {
  return APPEARANCE_PRESETS.foundation[foundation].palettes;
}

export function getDefaultFoundationPalette(
  foundation: FoundationId,
): FoundationPaletteId {
  return APPEARANCE_PRESETS.foundation[foundation].defaultPalette;
}

/** Surface temperature character for atmospheric derivation (not saturated color). */
export type SurfaceBiasStyle =
  | 'smoked_charcoal'
  | 'violet_smoke'
  | 'cool_graphite'
  | 'moss_charcoal';

export interface AtmosphericIdentity {
  /** Hue family anchor — low blend weight on surfaces only */
  ambientHue: number;
  /** -1 cool … 0 neutral … +1 warm */
  ambientTemperature: number;
  surfaceBias: SurfaceBiasStyle;
  /** Environmental lighting RGB channels (primary identity carrier) */
  shadowTint: string;
  glowTint: string;
  hazeTint: string;
  /** Perceptual density: -1 soft/flatter … +1 sharp/deep (not luminance bands) */
  ambientContrastBias: number;
}

const NEUTRAL_ATMOSPHERIC_IDENTITY: AtmosphericIdentity = {
  ambientHue: 38,
  ambientTemperature: 0,
  surfaceBias: 'smoked_charcoal',
  shadowTint: '11 13 16',
  glowTint: '100 90 80',
  hazeTint: '120 110 90',
  ambientContrastBias: 0,
};

const DARK_FOUNDATION_IDENTITIES: Record<DarkFoundationPaletteId, AtmosphericIdentity> = {
  ocean: {
    ambientHue: 210,
    ambientTemperature: -0.6,
    surfaceBias: 'cool_graphite',
    shadowTint: '8 14 22',
    glowTint: '56 120 160',
    hazeTint: '40 90 130',
    ambientContrastBias: 0.2,
  },
  midnight: {
    ambientHue: 265,
    ambientTemperature: -0.3,
    surfaceBias: 'smoked_charcoal',
    shadowTint: '12 10 18',
    glowTint: '90 75 130',
    hazeTint: '70 55 110',
    ambientContrastBias: 0.1,
  },
  forest: {
    ambientHue: 140,
    ambientTemperature: -0.2,
    surfaceBias: 'moss_charcoal',
    shadowTint: '10 14 12',
    glowTint: '45 80 55',
    hazeTint: '30 55 40',
    ambientContrastBias: -0.3,
  },
  ember: {
    ambientHue: 30,
    ambientTemperature: 0.6,
    surfaceBias: 'smoked_charcoal',
    shadowTint: '18 14 10',
    glowTint: '140 90 50',
    hazeTint: '120 80 50',
    ambientContrastBias: -0.4,
  },
  deep_space: {
    ambientHue: 235,
    ambientTemperature: -0.7,
    surfaceBias: 'cool_graphite',
    shadowTint: '4 6 14',
    glowTint: '70 80 140',
    hazeTint: '35 45 90',
    ambientContrastBias: 0.5,
  },
};

const LIGHT_FOUNDATION_IDENTITIES: Record<LightFoundationPaletteId, AtmosphericIdentity> = {
  sunset: {
    ambientHue: 25,
    ambientTemperature: 0.5,
    surfaceBias: 'smoked_charcoal',
    shadowTint: '40 30 25',
    glowTint: '200 120 80',
    hazeTint: '180 100 70',
    ambientContrastBias: -0.2,
  },
  desert: {
    ambientHue: 35,
    ambientTemperature: 0.4,
    surfaceBias: 'smoked_charcoal',
    shadowTint: '50 40 30',
    glowTint: '180 140 90',
    hazeTint: '160 120 80',
    ambientContrastBias: -0.1,
  },
  arctic: {
    ambientHue: 200,
    ambientTemperature: -0.5,
    surfaceBias: 'cool_graphite',
    shadowTint: '20 30 40',
    glowTint: '80 140 180',
    hazeTint: '60 120 160',
    ambientContrastBias: 0.15,
  },
};

const HOLIDAY_IDENTITIES: Record<HolidayPaletteId, AtmosphericIdentity> = {
  trans: {
    ambientHue: 195,
    ambientTemperature: 0,
    surfaceBias: 'cool_graphite',
    shadowTint: '30 40 50',
    glowTint: '120 190 210',
    hazeTint: '140 170 200',
    ambientContrastBias: 0,
  },
  pride: {
    ambientHue: 280,
    ambientTemperature: 0,
    surfaceBias: 'smoked_charcoal',
    shadowTint: '30 25 35',
    glowTint: '200 80 100',
    hazeTint: '180 100 120',
    ambientContrastBias: 0,
  },
  halloween: {
    ambientHue: 280,
    ambientTemperature: -0.1,
    surfaceBias: 'smoked_charcoal',
    shadowTint: '14 10 18',
    glowTint: '160 80 40',
    hazeTint: '90 50 120',
    ambientContrastBias: 0.1,
  },
  christmas: {
    ambientHue: 150,
    ambientTemperature: -0.1,
    surfaceBias: 'moss_charcoal',
    shadowTint: '8 14 10',
    glowTint: '40 100 60',
    hazeTint: '30 70 45',
    ambientContrastBias: 0,
  },
};

export const ATMOSPHERIC_IDENTITIES: Partial<Record<GlobalPaletteId, AtmosphericIdentity>> = {
  ...DARK_FOUNDATION_IDENTITIES,
  ...LIGHT_FOUNDATION_IDENTITIES,
  ...HOLIDAY_IDENTITIES,
};

export interface ResolveAtmosphericIdentityOptions {
  strength?: number;
}

/** Resolve palette atmospheric profile with optional strength multiplier (tint boost). */
export function resolveAtmosphericIdentity(
  paletteId: GlobalPaletteId | undefined,
  options: ResolveAtmosphericIdentityOptions = {},
): AtmosphericIdentity {
  const base =
    (paletteId && ATMOSPHERIC_IDENTITIES[paletteId]) ?? NEUTRAL_ATMOSPHERIC_IDENTITY;
  const strength = options.strength ?? 1;

  if (strength === 1 || !paletteId) {
    return { ...base };
  }

  const palette = GLOBAL_PALETTES[paletteId];
  const bgBias = extractCanvasHueBiasFromHex(palette.bg);

  return {
    ...base,
    ambientHue: blendHueDegrees(base.ambientHue, bgBias.canvasHue, 0.1 * (strength - 1)),
    ambientTemperature: clamp(
      base.ambientTemperature + (bgBias.warmth - 0.5) * 0.1 * (strength - 1),
      -1,
      1,
    ),
    ambientContrastBias: clamp(base.ambientContrastBias * strength, -1, 1),
  };
}

function extractCanvasHueBiasFromHex(hex: string): {
  canvasHue: number;
  warmth: number;
  saturation: number;
} {
  const normalized = hex.replace('#', '').trim();
  let r = 0;
  let g = 0;
  let b = 0;
  if (normalized.length === 6) {
    r = parseInt(normalized.slice(0, 2), 16);
    g = parseInt(normalized.slice(2, 4), 16);
    b = parseInt(normalized.slice(4, 6), 16);
  }
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = (max + min) / 2 > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
    }
  }
  const hue = h * 360;
  return {
    canvasHue: hue,
    warmth: Math.min(1, Math.max(0, 1 - Math.abs(hue - 38) / 90)),
    saturation: Math.min(0.35, Math.max(0.04, s)),
  };
}

function blendHueDegrees(baseHue: number, biasHue: number, weight: number): number {
  const delta = ((biasHue - baseHue + 540) % 360) - 180;
  return (baseHue + delta * weight + 360) % 360;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
