import type { GlobalPaletteId } from './appearancePresets';
import type { ResolvedThemePreset } from './atmosphericDerivation';

export type HeadingTone =
  | 'cool_silver'
  | 'warm_ivory'
  | 'cold_mist'
  | 'moss_gold'
  | 'neutral_parchment';

export type HeadingTracking = 'tight' | 'normal' | 'lunar';
export type SpacingCadence = 'dense' | 'balanced' | 'airy';
export type QuoteStyle = 'literary' | 'minimal';

export interface ThemeTypographySignature {
  headingTone: HeadingTone;
  headingLuminanceLift: number;
  headingWeightBias: number;
  headingTracking: HeadingTracking;
  serifDisplay: boolean;
  proseWarmth: number;
  proseLineHeight: number;
  spacingCadence: SpacingCadence;
  quoteStyle: QuoteStyle;
}

export interface TypographySignatureCssVariables {
  '--color-display-foreground': string;
  '--color-prose-foreground': string;
  '--color-prose-muted': string;
  '--type-display-weight': string;
  '--type-display-tracking': string;
  '--type-display-size': string;
  '--type-display-subtitle-gap': string;
  '--type-prose-line-height': string;
  '--type-section-gap-scale': string;
  '--type-meta-luminance-cap': string;
  '--type-prose-subdued-opacity': string;
}

const DARK_FOUNDATION_TYPOGRAPHY: Record<
  'ocean' | 'midnight' | 'forest' | 'ember' | 'deep_space',
  ThemeTypographySignature
> = {
  midnight: {
    headingTone: 'cool_silver',
    headingLuminanceLift: 0.1,
    headingWeightBias: 0.05,
    headingTracking: 'lunar',
    serifDisplay: true,
    proseWarmth: 0.15,
    proseLineHeight: 1.65,
    spacingCadence: 'balanced',
    quoteStyle: 'literary',
  },
  ember: {
    headingTone: 'warm_ivory',
    headingLuminanceLift: 0.12,
    headingWeightBias: 0.12,
    headingTracking: 'tight',
    serifDisplay: true,
    proseWarmth: 0.45,
    proseLineHeight: 1.62,
    spacingCadence: 'dense',
    quoteStyle: 'literary',
  },
  ocean: {
    headingTone: 'cold_mist',
    headingLuminanceLift: 0.08,
    headingWeightBias: -0.05,
    headingTracking: 'normal',
    serifDisplay: true,
    proseWarmth: 0.1,
    proseLineHeight: 1.72,
    spacingCadence: 'airy',
    quoteStyle: 'minimal',
  },
  forest: {
    headingTone: 'moss_gold',
    headingLuminanceLift: 0.09,
    headingWeightBias: 0.02,
    headingTracking: 'normal',
    serifDisplay: true,
    proseWarmth: 0.3,
    proseLineHeight: 1.68,
    spacingCadence: 'balanced',
    quoteStyle: 'literary',
  },
  deep_space: {
    headingTone: 'neutral_parchment',
    headingLuminanceLift: 0.06,
    headingWeightBias: -0.08,
    headingTracking: 'lunar',
    serifDisplay: true,
    proseWarmth: 0.05,
    proseLineHeight: 1.7,
    spacingCadence: 'airy',
    quoteStyle: 'minimal',
  },
};

const LIGHT_FOUNDATION_TYPOGRAPHY: Record<
  'sunset' | 'desert' | 'arctic',
  ThemeTypographySignature
> = {
  sunset: {
    headingTone: 'warm_ivory',
    headingLuminanceLift: 0.02,
    headingWeightBias: 0.14,
    headingTracking: 'tight',
    serifDisplay: true,
    proseWarmth: 0.55,
    proseLineHeight: 1.68,
    spacingCadence: 'balanced',
    quoteStyle: 'literary',
  },
  desert: {
    headingTone: 'warm_ivory',
    headingLuminanceLift: 0.01,
    headingWeightBias: 0.12,
    headingTracking: 'normal',
    serifDisplay: true,
    proseWarmth: 0.65,
    proseLineHeight: 1.66,
    spacingCadence: 'dense',
    quoteStyle: 'literary',
  },
  arctic: {
    headingTone: 'cold_mist',
    headingLuminanceLift: 0.02,
    headingWeightBias: 0.1,
    headingTracking: 'normal',
    serifDisplay: true,
    proseWarmth: 0.2,
    proseLineHeight: 1.7,
    spacingCadence: 'airy',
    quoteStyle: 'minimal',
  },
};

const NEUTRAL_TYPOGRAPHY: ThemeTypographySignature = {
  headingTone: 'neutral_parchment',
  headingLuminanceLift: 0.07,
  headingWeightBias: 0,
  headingTracking: 'normal',
  serifDisplay: true,
  proseWarmth: 0.2,
  proseLineHeight: 1.65,
  spacingCadence: 'balanced',
  quoteStyle: 'minimal',
};

const LIGHT_INK_DISPLAY = '#2a241c';
const LIGHT_INK_MUTED = '#4a4238';

function parseHexColor(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 6) {
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
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
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toByte = (value: number) =>
    Math.round(Math.min(255, Math.max(0, (value + m) * 255)));
  return `#${[toByte(r), toByte(g), toByte(b)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
}

function toneHue(tone: HeadingTone): number {
  switch (tone) {
    case 'cool_silver':
      return 250;
    case 'warm_ivory':
      return 38;
    case 'cold_mist':
      return 210;
    case 'moss_gold':
      return 95;
    default:
      return 40;
  }
}

function trackingValue(tracking: HeadingTracking): string {
  switch (tracking) {
    case 'tight':
      return '-0.03em';
    case 'lunar':
      return '0.02em';
    default:
      return '-0.02em';
  }
}

function sectionGapScale(cadence: SpacingCadence): string {
  switch (cadence) {
    case 'dense':
      return '0.85';
    case 'airy':
      return '1.35';
    default:
      return '1';
  }
}

function isLightFoundationPalette(
  paletteId: GlobalPaletteId | undefined,
): paletteId is 'sunset' | 'desert' | 'arctic' {
  return paletteId === 'sunset' || paletteId === 'desert' || paletteId === 'arctic';
}

export function resolveTypographySignature(
  paletteId: GlobalPaletteId | undefined,
  preset: ResolvedThemePreset,
): ThemeTypographySignature {
  if (paletteId && isLightFoundationPalette(paletteId)) {
    return LIGHT_FOUNDATION_TYPOGRAPHY[paletteId];
  }
  if (paletteId && paletteId in DARK_FOUNDATION_TYPOGRAPHY) {
    return DARK_FOUNDATION_TYPOGRAPHY[paletteId as keyof typeof DARK_FOUNDATION_TYPOGRAPHY];
  }
  if (preset === 'fantasy') {
    return DARK_FOUNDATION_TYPOGRAPHY.midnight;
  }
  if (preset === 'parchment' || preset === 'light') {
    return {
      ...LIGHT_FOUNDATION_TYPOGRAPHY.arctic,
      headingTone: 'warm_ivory',
      proseWarmth: 0.45,
    };
  }
  return NEUTRAL_TYPOGRAPHY;
}

export function deriveTypographySignatureCssVariables(
  signature: ThemeTypographySignature,
  focalForeground: string,
  focalMuted: string,
  mode: 'light' | 'dark' = 'dark',
): TypographySignatureCssVariables {
  if (mode === 'light') {
    const displayWeight = Math.min(
      650,
      Math.max(500, 520 + signature.headingWeightBias * 100),
    );
    const mutedParts = parseHexColor(LIGHT_INK_MUTED);
    const proseMutedHex = mutedParts
      ? (() => {
          const [h, s, l] = rgbToHsl(mutedParts[0], mutedParts[1], mutedParts[2]);
          const warmHue = h + (38 - h) * signature.proseWarmth * 0.2;
          return hslToHex(warmHue, Math.min(0.12, s + 0.02), l);
        })()
      : LIGHT_INK_MUTED;

    return {
      '--color-display-foreground': LIGHT_INK_DISPLAY,
      '--color-prose-foreground': LIGHT_INK_DISPLAY,
      '--color-prose-muted': proseMutedHex,
      '--type-display-weight': String(displayWeight),
      '--type-display-tracking': trackingValue(signature.headingTracking),
      '--type-display-size': 'clamp(2rem, 4.5vw, 3.5rem)',
      '--type-display-subtitle-gap': 'calc(var(--space-section, 1.5rem) * 2.25)',
      '--type-prose-line-height': String(signature.proseLineHeight),
      '--type-section-gap-scale': sectionGapScale(signature.spacingCadence),
      '--type-meta-luminance-cap': '0.88',
      '--type-prose-subdued-opacity': '1',
    };
  }

  const fgParts = parseHexColor(focalForeground);
  const mutedParts = parseHexColor(focalMuted);
  const displayHex = fgParts
    ? (() => {
        const [h, s, l] = rgbToHsl(fgParts[0], fgParts[1], fgParts[2]);
        const displayHue = h + (toneHue(signature.headingTone) - h) * 0.25;
        return hslToHex(
          displayHue,
          Math.min(0.12, s + 0.02),
          Math.min(0.96, l + signature.headingLuminanceLift),
        );
      })()
    : focalForeground;

  const proseMutedHex = mutedParts
    ? (() => {
        const [h, s, l] = rgbToHsl(mutedParts[0], mutedParts[1], mutedParts[2]);
        const warmHue = h + (38 - h) * signature.proseWarmth * 0.15;
        return hslToHex(warmHue, s * 0.9, l * 0.92);
      })()
    : focalMuted;

  const displayWeight = Math.min(650, Math.max(450, 500 + signature.headingWeightBias * 100));

  return {
    '--color-display-foreground': displayHex,
    '--color-prose-foreground': focalForeground,
    '--color-prose-muted': proseMutedHex,
    '--type-display-weight': String(displayWeight),
    '--type-display-tracking': trackingValue(signature.headingTracking),
    '--type-display-size': 'clamp(1.875rem, 4vw, 3.25rem)',
    '--type-display-subtitle-gap': 'calc(var(--space-section, 1.5rem) * 1.75)',
    '--type-prose-line-height': String(signature.proseLineHeight),
    '--type-section-gap-scale': sectionGapScale(signature.spacingCadence),
    '--type-meta-luminance-cap': '0.72',
    '--type-prose-subdued-opacity': '0.92',
  };
}
