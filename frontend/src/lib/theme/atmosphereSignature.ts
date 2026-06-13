import type { GlobalPaletteId } from './appearancePresets';
import type { ResolvedThemePreset } from './atmosphericDerivation';

export type BloomBehavior =
  | 'peripheral_moonlit'
  | 'warm_center_glow'
  | 'depth_fog_cold_top'
  | 'filtered_bioluminescent'
  | 'desaturated_dust'
  | 'pulse_magical';

export type GradientBehavior =
  | 'periphery_violet'
  | 'warm_rise'
  | 'horizon_fog'
  | 'canopy_filter'
  | 'void_vignette';

export type EventEscalationCurve = 'linear' | 'soft' | 'dramatic';

export type WarmCorner = 'none' | 'bl' | 'br' | 'tr';
export type ColdCorner = 'none' | 'tl' | 'tr';

/** Compositional imbalance — mockup-style controlled asymmetry */
export interface AtmosphericCompositionBias {
  horizontalBias: -1 | 0 | 1;
  verticalBias: -1 | 0 | 1;
  warmCorner: WarmCorner;
  coldCorner: ColdCorner;
}

/** Environmental rendering behavior — NOT slab colors */
export interface ThemeAtmosphereSignature {
  ambientHue: number;
  edgeLightRgb: string;
  edgeLightAlpha: number;
  bloomBehavior: BloomBehavior;
  gradientBehavior: GradientBehavior;
  shadowBias: number;
  fogDensity: number;
  focalIntensity: number;
  peripheryStrength: number;
  atmosphericAmplitude: number;
  eventEscalationCurve: EventEscalationCurve;
  compositionBias: AtmosphericCompositionBias;
  /** ~1.4× material edge light on sidebar rim */
  sidebarEdgeLightAlpha: number;
  /** HSL lightness lift for identity band above sidebar base */
  sidebarDepthLift: number;
}

export interface AtmosphereSignatureCssVariables {
  '--color-edge-light-rgb': string;
  '--atmosphere-edge-light-alpha': string;
  '--color-atmosphere-material-shadow-rgb': string;
  '--atmosphere-periphery-strength': string;
  '--atmosphere-fog-density': string;
  '--atmosphere-focal-intensity': string;
  '--atmosphere-amplitude': string;
  '--atmosphere-gradient-behavior': string;
  '--atmosphere-bloom-behavior': string;
  '--atmosphere-event-escalation': string;
  '--atmosphere-bias-horizontal': string;
  '--atmosphere-bias-vertical': string;
  '--atmosphere-warm-corner': string;
  '--atmosphere-cold-corner': string;
  '--atmosphere-breathe-amplitude': string;
  '--color-void': string;
  '--color-void-rgb': string;
  '--atmosphere-void-preservation': string;
  '--atmosphere-sidebar-edge-alpha': string;
  '--color-sidebar-base': string;
  '--color-sidebar-lifted': string;
  '--color-sidebar-base-rgb': string;
  '--color-sidebar-lifted-rgb': string;
}

const DEFAULT_COMPOSITION_BIAS: AtmosphericCompositionBias = {
  horizontalBias: 0,
  verticalBias: 0,
  warmCorner: 'none',
  coldCorner: 'none',
};

const DARK_FOUNDATION_SIGNATURES: Record<
  'ocean' | 'midnight' | 'forest' | 'ember' | 'deep_space',
  ThemeAtmosphereSignature
> = {
  midnight: {
    ambientHue: 265,
    edgeLightRgb: '139 92 246',
    edgeLightAlpha: 0.12,
    bloomBehavior: 'peripheral_moonlit',
    gradientBehavior: 'periphery_violet',
    shadowBias: 0.45,
    fogDensity: 1.25,
    focalIntensity: 1.45,
    peripheryStrength: 0.92,
    atmosphericAmplitude: 1.35,
    eventEscalationCurve: 'soft',
    sidebarEdgeLightAlpha: 0.14,
    sidebarDepthLift: 0.012,
    compositionBias: {
      horizontalBias: -1,
      verticalBias: -1,
      warmCorner: 'br',
      coldCorner: 'tl',
    },
  },
  ember: {
    ambientHue: 30,
    edgeLightRgb: '180 100 50',
    edgeLightAlpha: 0.11,
    bloomBehavior: 'warm_center_glow',
    gradientBehavior: 'warm_rise',
    shadowBias: 0.55,
    fogDensity: 1.15,
    focalIntensity: 1.3,
    peripheryStrength: 0.75,
    atmosphericAmplitude: 1.25,
    eventEscalationCurve: 'dramatic',
    sidebarEdgeLightAlpha: 0.13,
    sidebarDepthLift: 0.01,
    compositionBias: {
      horizontalBias: 0,
      verticalBias: 1,
      warmCorner: 'bl',
      coldCorner: 'none',
    },
  },
  ocean: {
    ambientHue: 210,
    edgeLightRgb: '56 120 160',
    edgeLightAlpha: 0.09,
    bloomBehavior: 'depth_fog_cold_top',
    gradientBehavior: 'horizon_fog',
    shadowBias: 0.4,
    fogDensity: 1.2,
    focalIntensity: 1.2,
    peripheryStrength: 0.8,
    atmosphericAmplitude: 1.15,
    eventEscalationCurve: 'soft',
    sidebarEdgeLightAlpha: 0.11,
    sidebarDepthLift: 0.01,
    compositionBias: {
      horizontalBias: 0,
      verticalBias: -1,
      warmCorner: 'none',
      coldCorner: 'tr',
    },
  },
  forest: {
    ambientHue: 140,
    edgeLightRgb: '70 120 75',
    edgeLightAlpha: 0.07,
    bloomBehavior: 'filtered_bioluminescent',
    gradientBehavior: 'canopy_filter',
    shadowBias: 0.42,
    fogDensity: 1.05,
    focalIntensity: 1.1,
    peripheryStrength: 0.65,
    atmosphericAmplitude: 1.1,
    eventEscalationCurve: 'soft',
    sidebarEdgeLightAlpha: 0.1,
    sidebarDepthLift: 0.01,
    compositionBias: {
      horizontalBias: -1,
      verticalBias: 0,
      warmCorner: 'tr',
      coldCorner: 'none',
    },
  },
  deep_space: {
    ambientHue: 235,
    edgeLightRgb: '70 80 140',
    edgeLightAlpha: 0.05,
    bloomBehavior: 'desaturated_dust',
    gradientBehavior: 'void_vignette',
    shadowBias: 0.35,
    fogDensity: 0.9,
    focalIntensity: 1.0,
    peripheryStrength: 0.95,
    atmosphericAmplitude: 1.0,
    eventEscalationCurve: 'linear',
    sidebarEdgeLightAlpha: 0.08,
    sidebarDepthLift: 0.008,
    compositionBias: {
      horizontalBias: 0,
      verticalBias: 0,
      warmCorner: 'none',
      coldCorner: 'tl',
    },
  },
};

const LIGHT_FOUNDATION_SIGNATURES: Record<
  'sunset' | 'desert' | 'arctic',
  ThemeAtmosphereSignature
> = {
  sunset: {
    ambientHue: 25,
    edgeLightRgb: '200 120 80',
    edgeLightAlpha: 0.08,
    bloomBehavior: 'warm_center_glow',
    gradientBehavior: 'warm_rise',
    shadowBias: 0.35,
    fogDensity: 0.95,
    focalIntensity: 1.15,
    peripheryStrength: 0.55,
    atmosphericAmplitude: 1.1,
    eventEscalationCurve: 'soft',
    sidebarEdgeLightAlpha: 0.1,
    sidebarDepthLift: 0.008,
    compositionBias: {
      horizontalBias: 0,
      verticalBias: -1,
      warmCorner: 'tr',
      coldCorner: 'none',
    },
  },
  desert: {
    ambientHue: 35,
    edgeLightRgb: '180 140 90',
    edgeLightAlpha: 0.07,
    bloomBehavior: 'warm_center_glow',
    gradientBehavior: 'warm_rise',
    shadowBias: 0.32,
    fogDensity: 0.9,
    focalIntensity: 1.1,
    peripheryStrength: 0.5,
    atmosphericAmplitude: 1.05,
    eventEscalationCurve: 'soft',
    sidebarEdgeLightAlpha: 0.09,
    sidebarDepthLift: 0.008,
    compositionBias: {
      horizontalBias: -1,
      verticalBias: 1,
      warmCorner: 'br',
      coldCorner: 'none',
    },
  },
  arctic: {
    ambientHue: 200,
    edgeLightRgb: '80 140 180',
    edgeLightAlpha: 0.07,
    bloomBehavior: 'depth_fog_cold_top',
    gradientBehavior: 'horizon_fog',
    shadowBias: 0.3,
    fogDensity: 1.0,
    focalIntensity: 1.1,
    peripheryStrength: 0.6,
    atmosphericAmplitude: 1.08,
    eventEscalationCurve: 'soft',
    sidebarEdgeLightAlpha: 0.09,
    sidebarDepthLift: 0.008,
    compositionBias: {
      horizontalBias: 0,
      verticalBias: -1,
      warmCorner: 'none',
      coldCorner: 'tr',
    },
  },
};

const NEUTRAL_SIGNATURE: ThemeAtmosphereSignature = {
  ambientHue: 220,
  edgeLightRgb: '214 197 168',
  edgeLightAlpha: 0.06,
  bloomBehavior: 'desaturated_dust',
  gradientBehavior: 'void_vignette',
  shadowBias: 0.25,
  fogDensity: 1.0,
  focalIntensity: 1.0,
  peripheryStrength: 0.5,
  atmosphericAmplitude: 1.0,
  eventEscalationCurve: 'soft',
  sidebarEdgeLightAlpha: 0.085,
  sidebarDepthLift: 0.008,
  compositionBias: DEFAULT_COMPOSITION_BIAS,
};

const GENRE_SIGNATURES: Record<
  'fantasy' | 'cyberpunk',
  ThemeAtmosphereSignature
> = {
  fantasy: {
    ...DARK_FOUNDATION_SIGNATURES.midnight,
    bloomBehavior: 'peripheral_moonlit',
    gradientBehavior: 'periphery_violet',
    atmosphericAmplitude: 1.3,
  },
  cyberpunk: {
    ...DARK_FOUNDATION_SIGNATURES.deep_space,
    edgeLightRgb: '34 211 238',
    edgeLightAlpha: 0.08,
    bloomBehavior: 'pulse_magical',
    gradientBehavior: 'horizon_fog',
    focalIntensity: 1.2,
    atmosphericAmplitude: 1.2,
    compositionBias: {
      horizontalBias: 1,
      verticalBias: -1,
      warmCorner: 'none',
      coldCorner: 'tr',
    },
  },
};

function blendRgbStrings(a: string, b: string, weight: number): string {
  const left = a.split(' ').map(Number);
  const right = b.split(' ').map(Number);
  return left
    .map((channel, index) =>
      Math.round(channel * (1 - weight) + (right[index] ?? channel) * weight),
    )
    .join(' ');
}

function isLightFoundationPalette(
  paletteId: GlobalPaletteId | undefined,
): paletteId is 'sunset' | 'desert' | 'arctic' {
  return paletteId === 'sunset' || paletteId === 'desert' || paletteId === 'arctic';
}

function hslToHexLocal(h: number, s: number, l: number): string {
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

function hexToRgbStringLocal(hex: string, fallback: string): string {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) return fallback;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return fallback;
  return `${r} ${g} ${b}`;
}

export function deriveSidebarSurfaceColors(
  signature: ThemeAtmosphereSignature,
  depth1Hex: string,
  depth1Rgb: string,
): Pick<
  AtmosphereSignatureCssVariables,
  | '--color-sidebar-base'
  | '--color-sidebar-lifted'
  | '--color-sidebar-base-rgb'
  | '--color-sidebar-lifted-rgb'
> {
  const normalized = depth1Hex.replace('#', '').trim();
  if (normalized.length !== 6) {
    return {
      '--color-sidebar-base': depth1Hex,
      '--color-sidebar-lifted': depth1Hex,
      '--color-sidebar-base-rgb': depth1Rgb,
      '--color-sidebar-lifted-rgb': depth1Rgb,
    };
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return {
      '--color-sidebar-base': depth1Hex,
      '--color-sidebar-lifted': depth1Hex,
      '--color-sidebar-base-rgb': depth1Rgb,
      '--color-sidebar-lifted-rgb': depth1Rgb,
    };
  }

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

  const lifted = hslToHexLocal(
    h * 360 + (signature.ambientHue - h * 360) * 0.08,
    Math.min(0.14, s + 0.01),
    Math.min(0.98, l + signature.sidebarDepthLift),
  );
  const liftedRgb = hexToRgbStringLocal(lifted, depth1Rgb);

  return {
    '--color-sidebar-base': depth1Hex,
    '--color-sidebar-lifted': lifted,
    '--color-sidebar-base-rgb': depth1Rgb,
    '--color-sidebar-lifted-rgb': liftedRgb,
  };
}

function breatheAmplitudeForCurve(curve: EventEscalationCurve): number {
  switch (curve) {
    case 'dramatic':
      return 1.35;
    case 'linear':
      return 0.85;
    default:
      return 1.0;
  }
}

export function resolveAtmosphereSignature(
  paletteId: GlobalPaletteId | undefined,
  preset: ResolvedThemePreset,
  shadowTint: string,
  strength = 1,
): ThemeAtmosphereSignature {
  let base: ThemeAtmosphereSignature;

  if (paletteId && isLightFoundationPalette(paletteId)) {
    base = LIGHT_FOUNDATION_SIGNATURES[paletteId];
  } else if (paletteId && paletteId in DARK_FOUNDATION_SIGNATURES) {
    base = DARK_FOUNDATION_SIGNATURES[paletteId as keyof typeof DARK_FOUNDATION_SIGNATURES];
  } else if (preset === 'fantasy' || preset === 'cyberpunk') {
    base = GENRE_SIGNATURES[preset];
  } else if (preset === 'light' || preset === 'parchment') {
    base = LIGHT_FOUNDATION_SIGNATURES.arctic;
  } else {
    base = NEUTRAL_SIGNATURE;
  }

  const amp = base.atmosphericAmplitude * strength;

  return {
    ...base,
    fogDensity: base.fogDensity * strength,
    focalIntensity: base.focalIntensity * Math.min(1.5, strength),
    peripheryStrength: Math.min(1, base.peripheryStrength * strength),
    atmosphericAmplitude: amp,
    edgeLightAlpha: Math.min(0.14, base.edgeLightAlpha * strength),
    sidebarEdgeLightAlpha: Math.min(0.18, base.sidebarEdgeLightAlpha * strength),
  };
}

export function deriveAtmosphereSignatureCssVariables(
  signature: ThemeAtmosphereSignature,
  shadowTint: string,
  canvasRgb: string,
  sidebarBaseHex?: string,
  sidebarBaseRgb?: string,
  mode: 'light' | 'dark' = 'dark',
): AtmosphereSignatureCssVariables {
  const materialShadowRgb =
    mode === 'light'
      ? blendRgbStrings('42 38 32', shadowTint, signature.shadowBias * 0.2)
      : blendRgbStrings('9 11 17', shadowTint, signature.shadowBias * 0.35);
  const voidRgb =
    mode === 'light'
      ? blendRgbStrings(canvasRgb, '42 38 32', 0.22)
      : blendRgbStrings(canvasRgb, '5 6 8', 0.35);
  const sidebarColors =
    sidebarBaseHex && sidebarBaseRgb
      ? deriveSidebarSurfaceColors(signature, sidebarBaseHex, sidebarBaseRgb)
      : {
          '--color-sidebar-base': `rgb(${canvasRgb})`,
          '--color-sidebar-lifted': `rgb(${canvasRgb})`,
          '--color-sidebar-base-rgb': canvasRgb,
          '--color-sidebar-lifted-rgb': canvasRgb,
        };

  return {
    '--color-edge-light-rgb': signature.edgeLightRgb,
    '--atmosphere-edge-light-alpha': signature.edgeLightAlpha.toFixed(3),
    '--color-atmosphere-material-shadow-rgb': materialShadowRgb,
    '--atmosphere-periphery-strength': signature.peripheryStrength.toFixed(2),
    '--atmosphere-fog-density': signature.fogDensity.toFixed(2),
    '--atmosphere-focal-intensity': signature.focalIntensity.toFixed(2),
    '--atmosphere-amplitude': signature.atmosphericAmplitude.toFixed(2),
    '--atmosphere-gradient-behavior': signature.gradientBehavior,
    '--atmosphere-bloom-behavior': signature.bloomBehavior,
    '--atmosphere-event-escalation': signature.eventEscalationCurve,
    '--atmosphere-bias-horizontal': String(signature.compositionBias.horizontalBias),
    '--atmosphere-bias-vertical': String(signature.compositionBias.verticalBias),
    '--atmosphere-warm-corner': signature.compositionBias.warmCorner,
    '--atmosphere-cold-corner': signature.compositionBias.coldCorner,
    '--atmosphere-breathe-amplitude': breatheAmplitudeForCurve(
      signature.eventEscalationCurve,
    ).toFixed(2),
    '--atmosphere-sidebar-edge-alpha': signature.sidebarEdgeLightAlpha.toFixed(3),
    ...sidebarColors,
    '--color-void': `rgb(${voidRgb})`,
    '--color-void-rgb': voidRgb,
    '--atmosphere-void-preservation': mode === 'light' ? '0.22' : '0.35',
  };
}
