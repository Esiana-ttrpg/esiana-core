import { resolveAtmosphericIdentity, type SurfaceBiasStyle, type AtmosphericIdentity } from './appearancePresets';
import {
  deriveAtmosphereSignatureCssVariables,
  resolveAtmosphereSignature,
} from './atmosphereSignature';
import { deriveMaterialZoneCssVariables } from './materialZones';
import type { SceneCompositionProfile } from './sceneComposition';
import {
  applyGenreTransforms,
  applyGenreMaterialTransforms,
  blendGenreEnvironmentalIdentity,
  GENRE_ENVIRONMENTAL,
} from './genreIdentity';
import { modulateEventOverlay } from './eventOverlay';
import { resolveSaturationBudget } from './saturationBudget';
import { DEFAULT_EVENT_OVERLAY_STRENGTH } from './themeStack';
import { deriveSidebarNavCssVariables } from './sidebarNavDerivation';
import { resolveLuminanceEcology } from './luminanceEcology';
import { deriveZoneCssVariables } from './zoneDerivation';
import {
  deriveTypographySignatureCssVariables,
  resolveTypographySignature,
} from './typographySignature';
import type { ThemeConfig, ThemePresetId } from './themeTypes';

export type FocalStyle =
  | 'smoked_charcoal'
  | 'violet_smoke'
  | 'cool_graphite'
  | 'moss_charcoal'
  | 'light_page';

export type ResolvedThemePreset = Exclude<ThemePresetId, 'auto'>;

export interface CanvasHueBias {
  canvasHue: number;
  warmth: number;
  saturation: number;
}

export interface ThemeAtmosphereInput {
  mode: 'light' | 'dark';
  preset: ResolvedThemePreset;
  canvasHue: number;
  warmth: number;
  saturation: number;
  focalStyle: FocalStyle;
  accentPrimary: string;
  accentHover: string;
  accentColor: string;
  /** Surface drift (40% channel) */
  ambientHue: number;
  ambientTemperature: number;
  surfaceBias: SurfaceBiasStyle;
  /** Environmental lighting (60% channel) */
  shadowTint: string;
  glowTint: string;
  hazeTint: string;
  /** Perceptual density — not luminance bands */
  ambientContrastBias: number;
  identityStrength: number;
  hasPaletteIdentity: boolean;
}

export interface AtmosphericRoles {
  canvas: string;
  canvasElevated: string;
  surface: string;
  canvasRgb: string;
  surfaceRgb: string;
  canvasGradientMid: string;
  canvasGradientWarm: string;
  borderWarmRgb: string;
}

export interface DepthPalette {
  depth0: string;
  depth1: string;
  depth2: string;
  depth3: string;
  depth4: string;
  depth0Rgb: string;
  depth1Rgb: string;
  depth2Rgb: string;
  depth3Rgb: string;
}

export interface ContextualPalette {
  contextual: string;
  contextualForeground: string;
}

export interface EditorialFocal {
  focal: string;
  focalElevated: string;
  focalForeground: string;
  focalMuted: string;
  focalRgb: string;
  focalGlowRgb: string;
}

export interface OperationalContrast {
  recessed: string;
  operational: string;
}

export interface AtmosphericLighting {
  atmosphereGlowRgb: string;
  atmosphereShadowRgb: string;
  atmosphereHazeRgb: string;
  atmosphereHazeAlpha: string;
  /** Legacy alias — operational tier */
  atmosphereGlowAlpha: string;
  atmosphereGlowAlphaOperational: string;
  atmosphereGlowAlphaFocal: string;
  atmosphereGlowAlphaDramatic: string;
  atmosphereGlowAlphaSidebar: string;
  atmosphereGlowAlphaHero: string;
  atmosphereGlowAlphaRail: string;
}

export interface AtmosphericContrast {
  regionFadeStrength: string;
  shadowAlpha: string;
  shadowBlur: string;
  depthEdgeOpacity: string;
  vignetteStrength: string;
}

/** Palette participation in environmental channels (shadows, haze, depth fields, borders). */
const ENVIRONMENTAL_PARTICIPATION = 0.42;
/** Subtle hue drift on reading-adjacent surface hex values. */
const SURFACE_PARTICIPATION = 0.16;
/** Per-depth hue rotation toward ambientHue in the depth ladder. */
const DEPTH_HUE_STEP = 0.08;
/** Navy-charcoal anchor — palette identity stays in lighting channels, not canvas hue. */
const NEUTRAL_SURFACE_HUE = 220;
const BORDER_WARM_RGB = '214 197 168';

const DARK_FOCAL_VARIANTS: Record<
  Exclude<FocalStyle, 'light_page'>,
  {
    focal: string;
    elevated: string;
    foreground: string;
    muted: string;
    glow: string;
  }
> = {
  smoked_charcoal: {
    focal: '#1f1b18',
    elevated: '#26211d',
    foreground: '#e8e4dc',
    muted: '#9a9288',
    glow: '100 90 80',
  },
  violet_smoke: {
    focal: '#221e26',
    elevated: '#2a2430',
    foreground: '#ece6f0',
    muted: '#a89ab8',
    glow: '110 95 125',
  },
  cool_graphite: {
    focal: '#1a1c24',
    elevated: '#22252e',
    foreground: '#e2e8f0',
    muted: '#8a929e',
    glow: '85 100 120',
  },
  moss_charcoal: {
    focal: '#1a1f1a',
    elevated: '#212622',
    foreground: '#e4e8e4',
    muted: '#929a92',
    glow: '70 95 75',
  },
};

function parseHexColor(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return [
      parseInt(normalized[0]! + normalized[0], 16),
      parseInt(normalized[1]! + normalized[1], 16),
      parseInt(normalized[2]! + normalized[2], 16),
    ];
  }
  if (normalized.length === 6) {
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }
  return null;
}

function hexToRgbString(hex: string, fallback: string): string {
  const parts = parseHexColor(hex);
  if (!parts) return fallback;
  return parts.join(' ');
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

function blendHue(baseHue: number, biasHue: number, weight: number): number {
  const delta = ((biasHue - baseHue + 540) % 360) - 180;
  return (baseHue + delta * weight + 360) % 360;
}

function blendRgbStrings(a: string, b: string, weight: number): string {
  const left = a.split(' ').map(Number);
  const right = b.split(' ').map(Number);
  return left
    .map((channel, index) =>
      Math.round(channel * (1 - weight) + (right[index] ?? channel) * weight),
    )
    .join(' ');
}

function rgbStringToHex(rgb: string, fallback: string): string {
  const parts = rgb.split(' ').map(Number);
  if (parts.length !== 3 || parts.some((channel) => Number.isNaN(channel))) {
    return fallback;
  }
  return `#${parts
    .map((channel) => Math.min(255, Math.max(0, channel)).toString(16).padStart(2, '0'))
    .join('')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function environmentalBlend(strength: number): number {
  return ENVIRONMENTAL_PARTICIPATION * strength;
}

function surfaceDriftBlend(input: ThemeAtmosphereInput): number {
  return clamp(
    SURFACE_PARTICIPATION * (0.5 + input.saturation) * input.identityStrength,
    0,
    0.22,
  );
}

function gradientHazeBlend(input: ThemeAtmosphereInput): number {
  return clamp(0.12 * input.identityStrength, 0.08, 0.14);
}

function genreEnvironmentalStrength(input: ThemeAtmosphereInput): number {
  return isGenrePreset(input.preset) ? input.identityStrength * 1.2 : input.identityStrength;
}

function isGenrePreset(preset: ResolvedThemePreset): boolean {
  return preset === 'fantasy' || preset === 'cyberpunk';
}

function surfaceBiasToFocalStyle(bias: SurfaceBiasStyle): Exclude<FocalStyle, 'light_page'> {
  return bias;
}

export function isLightThemeMode(preset: ResolvedThemePreset, bg: string): boolean {
  if (preset === 'light' || preset === 'parchment') return true;
  const parts = parseHexColor(bg);
  if (!parts) return false;
  const [r, g, b] = parts;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

export function extractCanvasHueBias(hex: string): CanvasHueBias {
  const parts = parseHexColor(hex);
  if (!parts) {
    return { canvasHue: 40, warmth: 0.65, saturation: 0.12 };
  }
  const [h, s] = rgbToHsl(parts[0], parts[1], parts[2]);
  const warmth = Math.min(1, Math.max(0, 1 - Math.abs(h - 38) / 90));
  return {
    canvasHue: h,
    warmth,
    saturation: Math.min(0.35, Math.max(0.04, s)),
  };
}

export function focalStyleForPreset(preset: ResolvedThemePreset): FocalStyle {
  switch (preset) {
    case 'fantasy':
    case 'cyberpunk':
      return 'smoked_charcoal';
    case 'light':
    case 'parchment':
      return 'light_page';
    default:
      return 'smoked_charcoal';
  }
}

export function resolveThemeAtmosphereInput(
  config: ThemeConfig,
  preset: ResolvedThemePreset,
  bias?: Partial<CanvasHueBias>,
): ThemeAtmosphereInput {
  const anchorBias = extractCanvasHueBias(config.bg);
  const mode =
    config._genre === 'parchment'
      ? 'light'
      : isLightThemeMode(preset, config.bg)
        ? 'light'
        : 'dark';
  const identityStrength = config._identityStrength ?? 1;
  const activeGenre = config._genre;
  const genreBoost =
    activeGenre ? 1.15 : isGenrePreset(preset) ? 1.2 : 1;
  const baseIdentity = resolveAtmosphericIdentity(config._paletteId, {
    strength: identityStrength * genreBoost,
  });

  let identity: AtmosphericIdentity =
    activeGenre === 'fantasy' || activeGenre === 'cyberpunk'
      ? blendGenreEnvironmentalIdentity(baseIdentity, activeGenre)
      : baseIdentity;
  if (
    (preset === 'fantasy' || preset === 'cyberpunk') &&
    !config._paletteId
  ) {
    identity = {
      ...baseIdentity,
      ...GENRE_ENVIRONMENTAL[preset],
      surfaceBias: 'smoked_charcoal',
    };
  }

  const hasPaletteIdentity = config._paletteId !== undefined || isGenrePreset(preset);

  const focalStyle: FocalStyle =
    config._genre === 'parchment'
      ? 'light_page'
      : mode === 'light'
        ? 'light_page'
        : config._paletteId
          ? surfaceBiasToFocalStyle(identity.surfaceBias)
          : focalStyleForPreset(preset);

  const canvasHue = bias?.canvasHue ?? anchorBias.canvasHue;
  const warmth = bias?.warmth ?? anchorBias.warmth;
  const saturation = bias?.saturation ?? anchorBias.saturation;

  return {
    mode,
    preset,
    canvasHue,
    warmth,
    saturation,
    focalStyle,
    accentPrimary: config.primary,
    accentHover: config.primaryHover,
    accentColor: config.accent,
    ambientHue: identity.ambientHue,
    ambientTemperature: identity.ambientTemperature,
    surfaceBias: identity.surfaceBias,
    shadowTint: identity.shadowTint,
    glowTint: identity.glowTint,
    hazeTint: identity.hazeTint,
    ambientContrastBias: identity.ambientContrastBias,
    identityStrength,
    hasPaletteIdentity,
  };
}

function deriveAtmosphericBorderRgb(input: ThemeAtmosphereInput): string {
  if (!input.hasPaletteIdentity) {
    return BORDER_WARM_RGB;
  }
  const borderHex = hslToHex(input.ambientHue, 0.07, 0.55);
  const borderRgb = hexToRgbString(borderHex, BORDER_WARM_RGB);
  return blendRgbStrings(borderRgb, input.shadowTint, 0.25);
}

function deriveDarkFoundationCanvas(input: ThemeAtmosphereInput): AtmosphericRoles {
  const drift = clamp(surfaceDriftBlend(input) * 0.45, 0, 0.1);
  const hue = blendHue(NEUTRAL_SURFACE_HUE, input.ambientHue, drift);
  const envStrength = genreEnvironmentalStrength(input);
  const sat = clamp(
    0.04 + input.saturation * 0.04 * envStrength,
    0.03,
    0.07,
  );
  const canvas = hslToHex(hue, sat, 0.035);
  const canvasElevated = hslToHex(hue, sat + 0.01, 0.055);
  const surface = hslToHex(hue, sat + 0.015, 0.075);
  const canvasRgb = hexToRgbString(canvas, '9 11 17');
  const surfaceRgb = hexToRgbString(surface, '17 24 39');
  const hazeBlend = gradientHazeBlend(input);
  const borderWarmRgb = deriveAtmosphericBorderRgb(input);
  const gradientTintOpacity = clamp(0.1 * envStrength, 0.08, 0.12).toFixed(2);

  return {
    canvas,
    canvasElevated,
    surface,
    canvasRgb,
    surfaceRgb,
    canvasGradientMid: `rgb(${blendRgbStrings(surfaceRgb, input.hazeTint, hazeBlend)} / ${gradientTintOpacity})`,
    canvasGradientWarm: `rgb(${input.hazeTint} / ${clamp(0.1 * envStrength, 0.08, 0.12).toFixed(2)})`,
    borderWarmRgb,
  };
}

/** Sunlit archive paper ladder — palette tints lighting channels only. */
export function deriveLightFoundationCanvas(input: ThemeAtmosphereInput): AtmosphericRoles {
  const drift = clamp(surfaceDriftBlend(input) * 0.35, 0, 0.08);
  const baseHue = blendHue(40, input.ambientHue, drift);
  const sat = clamp(0.08 + input.saturation * 0.06 * input.identityStrength, 0.06, 0.14);
  const envStrength = input.identityStrength;

  const canvas = hslToHex(baseHue, sat, 0.942);
  const canvasElevated = hslToHex(baseHue, sat * 0.85, 0.975);
  const surface = hslToHex(baseHue, sat * 0.9, 0.958);
  const canvasRgb = hexToRgbString(canvas, '243 239 230');
  const surfaceRgb = hexToRgbString(surface, '247 243 234');
  const hazeAlpha = clamp(0.12 * envStrength, 0.08, 0.16).toFixed(2);
  const borderWarmRgb = deriveAtmosphericBorderRgb(input);

  return {
    canvas,
    canvasElevated,
    surface,
    canvasRgb,
    surfaceRgb,
    canvasGradientMid: `rgb(${blendRgbStrings(surfaceRgb, input.hazeTint, 0.12)} / 0.1)`,
    canvasGradientWarm: `rgb(${input.hazeTint} / ${hazeAlpha})`,
    borderWarmRgb,
  };
}

export function deriveAtmosphericRoles(
  input: ThemeAtmosphereInput,
  config: ThemeConfig,
): AtmosphericRoles {
  if (input.mode === 'light') {
    return deriveLightFoundationCanvas(input);
  }

  return deriveDarkFoundationCanvas(input);
}

export function deriveAtmosphericLighting(
  input: ThemeAtmosphereInput,
  config: ThemeConfig,
  focalIntensity = 1,
  fogDensity = 1,
  ecology = resolveLuminanceEcology(input.mode, config._paletteId),
): AtmosphericLighting {
  const accentRgb = hexToRgbString(config.accent, input.glowTint);
  const atmosphereGlowRgb = blendRgbStrings(input.glowTint, accentRgb, 0.15);
  const strength = genreEnvironmentalStrength(input);
  const intensity = clamp(focalIntensity, 0.85, 1.5);
  const reflective = ecology.lightingModel === 'reflective';

  const operational = reflective
    ? clamp(0.03 * strength, 0.02, 0.04).toFixed(2)
    : clamp(0.07 * strength, 0.06, 0.08).toFixed(2);
  const focal = reflective
    ? clamp(0.05 * strength * intensity, 0.04, 0.08).toFixed(2)
    : clamp(0.12 * strength * intensity, 0.1, 0.2).toFixed(2);
  const dramatic = reflective
    ? clamp(0.08 * strength * intensity, 0.06, 0.1).toFixed(2)
    : clamp(0.19 * strength * intensity, 0.16, 0.28).toFixed(2);
  const hazeBase = reflective
    ? clamp(0.06 * strength * fogDensity, 0.04, 0.1)
    : clamp(0.14 * strength * fogDensity, 0.1, 0.22);
  const operationalNum = Number(operational);

  return {
    atmosphereGlowRgb,
    atmosphereShadowRgb: input.shadowTint,
    atmosphereHazeRgb: input.hazeTint,
    atmosphereHazeAlpha: hazeBase.toFixed(2),
    atmosphereGlowAlpha: operational,
    atmosphereGlowAlphaOperational: operational,
    atmosphereGlowAlphaFocal: focal,
    atmosphereGlowAlphaDramatic: dramatic,
    atmosphereGlowAlphaSidebar: reflective
      ? clamp(operationalNum * 1.15, 0.025, 0.045).toFixed(2)
      : clamp(operationalNum * 1.2, 0.07, 0.1).toFixed(2),
    atmosphereGlowAlphaHero: dramatic,
    atmosphereGlowAlphaRail: reflective
      ? clamp(operationalNum * 0.9, 0.02, 0.035).toFixed(2)
      : clamp(operationalNum * 0.85, 0.05, 0.07).toFixed(2),
  };
}

export function deriveAtmosphericContrast(
  input: ThemeAtmosphereInput,
  peripheryStrength = 0.5,
  ecology = resolveLuminanceEcology(input.mode, undefined),
): AtmosphericContrast {
  const bias = input.ambientContrastBias;
  const paperRecession = ecology.contrastModel === 'paper_recession';

  const regionFadeStrength = paperRecession
    ? (0.14 + bias * 0.06).toFixed(2)
    : (0.28 + bias * 0.12).toFixed(2);
  const shadowAlpha = paperRecession
    ? (0.08 + bias * 0.04).toFixed(2)
    : (0.22 + bias * 0.06).toFixed(2);
  const shadowBlur = paperRecession
    ? `${Math.round(8 + bias * 2)}px`
    : `${Math.round(13 + bias * 3)}px`;
  const depthEdgeOpacity = paperRecession
    ? (0.06 + bias * 0.02).toFixed(2)
    : (0.09 + bias * 0.03).toFixed(2);
  const vignetteStrength = paperRecession
    ? clamp(0.12 + bias * 0.04 + peripheryStrength * 0.06, 0.1, 0.25).toFixed(2)
    : clamp(0.28 + bias * 0.08 + peripheryStrength * 0.12, 0.28, 0.55).toFixed(2);

  return {
    regionFadeStrength,
    shadowAlpha,
    shadowBlur,
    depthEdgeOpacity,
    vignetteStrength,
  };
}

export function deriveContextualPalette(
  input: ThemeAtmosphereInput,
  config: ThemeConfig,
  roles: AtmosphericRoles,
  focalRgb: string,
): ContextualPalette {
  if (input.mode === 'light') {
    const elevatedRgb = hexToRgbString(config.bgElevated, '241 245 249');
    return {
      contextual: `rgb(${elevatedRgb} / 0.88)`,
      contextualForeground: config.text,
    };
  }

  const midRgb = blendRgbStrings(roles.canvasRgb, focalRgb, 0.42);
  const env = input.hasPaletteIdentity ? environmentalBlend(input.identityStrength) : 0;
  const contextualRgb =
    env > 0 ? blendRgbStrings(midRgb, input.shadowTint, env) : midRgb;
  const alpha = input.preset === 'dark' ? 0.58 : 0.55;

  return {
    contextual: `rgb(${contextualRgb} / ${alpha})`,
    contextualForeground: config.text,
  };
}

function deriveDarkFocalFromCanvas(
  canvasHex: string,
  style: (typeof DARK_FOCAL_VARIANTS)[Exclude<FocalStyle, 'light_page'>],
  input: ThemeAtmosphereInput,
): Pick<EditorialFocal, 'focal' | 'focalElevated' | 'focalRgb'> {
  const canvasParts = parseHexColor(canvasHex);
  const styleParts = parseHexColor(style.focal);
  const elevatedParts = parseHexColor(style.elevated);
  if (!canvasParts || !styleParts || !elevatedParts) {
    return {
      focal: style.focal,
      focalElevated: style.elevated,
      focalRgb: hexToRgbString(style.focal, '31 27 24'),
    };
  }

  const [, , canvasLightness] = rgbToHsl(canvasParts[0], canvasParts[1], canvasParts[2]);
  const [styleHue, styleSat] = rgbToHsl(styleParts[0], styleParts[1], styleParts[2]);
  const [, , styleElevatedLightness] = rgbToHsl(
    elevatedParts[0],
    elevatedParts[1],
    elevatedParts[2],
  );
  const [, , anchorLightness] = rgbToHsl(styleParts[0], styleParts[1], styleParts[2]);
  const anchorLift = Math.max(0.02, styleElevatedLightness - anchorLightness);

  const allowSurfaceDrift =
    input.hasPaletteIdentity && input.preset === 'dark' && !isGenrePreset(input.preset);
  const focalHueBlend = allowSurfaceDrift ? 0.15 : 0;
  const blendedHue = blendHue(styleHue, input.ambientHue, focalHueBlend);
  // Keep reading surfaces neutral enough for long sessions.
  // Small RGB<->HSL rounding can slightly overshoot, so cap a bit under 0.10.
  const focalSat = clamp(styleSat, 0.02, 0.08);

  const focalLightness = Math.min(0.44, canvasLightness + 0.08);
  const focal = hslToHex(blendedHue, focalSat, focalLightness);
  const focalElevated = hslToHex(
    blendedHue,
    focalSat,
    Math.min(0.48, focalLightness + anchorLift),
  );

  return {
    focal,
    focalElevated,
    focalRgb: hexToRgbString(focal, '31 27 24'),
  };
}

export function deriveEditorialFocal(
  input: ThemeAtmosphereInput,
  config: ThemeConfig,
  roles?: AtmosphericRoles,
): EditorialFocal {
  if (input.focalStyle === 'light_page') {
    const focal = roles?.surface ?? config.surface;
    const focalElevated = roles?.canvasElevated ?? config.bgElevated;
    const focalRgb = hexToRgbString(focal, '247 243 234');
    const displayInk = '#2a241c';
    const mutedInk = '#4a4238';
    return {
      focal,
      focalElevated,
      focalForeground: displayInk,
      focalMuted: mutedInk,
      focalRgb,
      focalGlowRgb: blendRgbStrings('120 110 90', input.glowTint, 0.25),
    };
  }

  const style = DARK_FOCAL_VARIANTS[input.focalStyle];
  const canvasHex = roles?.canvas ?? config.bg;
  const lifted = deriveDarkFocalFromCanvas(canvasHex, style, input);
  const glowRgb = input.hasPaletteIdentity
    ? blendRgbStrings(style.glow, input.glowTint, 0.4)
    : style.glow;

  return {
    ...lifted,
    focalForeground: style.foreground,
    focalMuted: style.muted,
    focalGlowRgb: glowRgb,
  };
}

function deriveAtmosphericDepth1(
  input: ThemeAtmosphereInput,
  roles: AtmosphericRoles,
): { depth1: string; depth1Rgb: string } {
  const canvasParts = parseHexColor(roles.canvas);
  if (!canvasParts || !input.hasPaletteIdentity) {
    const depth1Rgb = blendRgbStrings(roles.canvasRgb, roles.surfaceRgb, 0.22);
    return {
      depth1: rgbStringToHex(depth1Rgb, roles.canvasElevated),
      depth1Rgb,
    };
  }

  const [canvasHue, canvasSat] = rgbToHsl(canvasParts[0], canvasParts[1], canvasParts[2]);
  const env = environmentalBlend(input.identityStrength);
  const drift = surfaceDriftBlend(input);
  const depth1Hue = blendHue(canvasHue, input.ambientHue, drift + DEPTH_HUE_STEP * env);
  const depth1Sat = clamp(canvasSat + 0.015, 0.05, 0.1);
  const depth1Lightness = clamp(0.048 + env * 0.004, 0.048, 0.055);
  const depth1 = hslToHex(depth1Hue, depth1Sat, depth1Lightness);

  return {
    depth1,
    depth1Rgb: hexToRgbString(depth1, roles.canvasRgb),
  };
}

function deriveAtmosphericDepth3(
  input: ThemeAtmosphereInput,
  focal: EditorialFocal,
): { depth3: string; depth3Rgb: string } {
  const elevatedRgb = hexToRgbString(focal.focalElevated, focal.focalRgb);
  if (!input.hasPaletteIdentity) {
    return { depth3: focal.focalElevated, depth3Rgb: elevatedRgb };
  }

  const elevatedParts = parseHexColor(focal.focalElevated);
  if (!elevatedParts) {
    return { depth3: focal.focalElevated, depth3Rgb: elevatedRgb };
  }

  const [elevatedHue, elevatedSat, elevatedLightness] = rgbToHsl(
    elevatedParts[0],
    elevatedParts[1],
    elevatedParts[2],
  );
  const glowParts = input.glowTint.split(' ').map(Number);
  const glowHue =
    glowParts.length === 3
      ? rgbToHsl(glowParts[0]!, glowParts[1]!, glowParts[2]!)[0]
      : input.ambientHue;
  const glowBlend = clamp(0.15 * environmentalBlend(input.identityStrength), 0.12, 0.18);
  const depth3Hue = blendHue(elevatedHue, glowHue, glowBlend);
  const depth3Sat = clamp(elevatedSat + 0.01, 0.02, 0.1);
  const depth3 = hslToHex(depth3Hue, depth3Sat, elevatedLightness);

  return {
    depth3,
    depth3Rgb: hexToRgbString(depth3, elevatedRgb),
  };
}

export function deriveDepthPalette(
  input: ThemeAtmosphereInput,
  roles: AtmosphericRoles,
  focal: EditorialFocal,
): DepthPalette {
  if (input.mode === 'light') {
    const drift = clamp(surfaceDriftBlend(input) * 0.35, 0, 0.08);
    const baseHue = blendHue(40, input.ambientHue, drift);
    const sat = clamp(0.08 + input.saturation * 0.06 * input.identityStrength, 0.06, 0.14);
    const depth1 = hslToHex(baseHue, sat * 1.05, 0.918);
    const silentProse = hslToHex(baseHue, sat * 0.75, 0.968);

    return {
      depth0: roles.canvas,
      depth1,
      depth2: focal.focal,
      depth3: silentProse,
      depth4: roles.canvasElevated,
      depth0Rgb: roles.canvasRgb,
      depth1Rgb: hexToRgbString(depth1, roles.canvasRgb),
      depth2Rgb: focal.focalRgb,
      depth3Rgb: hexToRgbString(silentProse, focal.focalRgb),
    };
  }

  const { depth1, depth1Rgb } = deriveAtmosphericDepth1(input, roles);
  const { depth3, depth3Rgb } = deriveAtmosphericDepth3(input, focal);

  return {
    depth0: roles.canvas,
    depth1,
    depth2: focal.focal,
    depth3,
    depth4: roles.canvasElevated,
    depth0Rgb: roles.canvasRgb,
    depth1Rgb,
    depth2Rgb: focal.focalRgb,
    depth3Rgb,
  };
}

export function deriveOperationalContrast(
  input: ThemeAtmosphereInput,
  config: ThemeConfig,
  focal?: EditorialFocal,
): OperationalContrast {
  if (input.mode === 'light') {
    return {
      recessed: '#6b6154',
      operational: '#5c5248',
    };
  }

  if (input.preset === 'dark' && focal) {
    const mutedParts = parseHexColor(focal.focalMuted);
    if (mutedParts) {
      const recessed = focal.focalMuted;
      const [, , recessedL] = rgbToHsl(mutedParts[0], mutedParts[1], mutedParts[2]);
      const operational = hslToHex(
        blendHue(
          rgbToHsl(mutedParts[0], mutedParts[1], mutedParts[2])[0],
          input.ambientHue,
          0.1,
        ),
        0.04,
        Math.min(0.65, recessedL + 0.04),
      );
      return { recessed, operational };
    }
  }

  if (input.preset === 'dark') {
    return {
      recessed: '#8a8278',
      operational: '#9a9288',
    };
  }

  return {
    recessed: config.textMuted,
    operational: config.textMuted,
  };
}

export interface DeriveSurfaceRoleOptions {
  bias?: Partial<CanvasHueBias>;
  scene?: SceneCompositionProfile | null;
}

/** Merge derived roles into CSS custom property map. */
export function deriveSurfaceRoleCssVariables(
  config: ThemeConfig,
  preset: ResolvedThemePreset,
  biasOrOptions?: Partial<CanvasHueBias> | DeriveSurfaceRoleOptions,
  legacyScene?: SceneCompositionProfile | null,
): Record<string, string> {
  const options: DeriveSurfaceRoleOptions =
    biasOrOptions && 'scene' in biasOrOptions
      ? biasOrOptions
      : { bias: biasOrOptions as Partial<CanvasHueBias> | undefined, scene: legacyScene };
  const bias = options.bias;
  const scene = options.scene;
  const input = resolveThemeAtmosphereInput(config, preset, bias);
  const roles = deriveAtmosphericRoles(input, config);
  const focal = deriveEditorialFocal(input, config, roles);
  const depth = deriveDepthPalette(input, roles, focal);
  const contextual = deriveContextualPalette(input, config, roles, focal.focalRgb);
  const operational = deriveOperationalContrast(input, config, focal);

  const baseAtmosphereSignature = resolveAtmosphereSignature(
    config._paletteId,
    preset,
    input.shadowTint,
    input.identityStrength,
  );
  const baseTypographySignature = resolveTypographySignature(config._paletteId, preset);
  const genrePass = applyGenreTransforms(
    baseAtmosphereSignature,
    baseTypographySignature,
    input.mode,
    config._paletteId,
    config._genre,
  );
  let atmosphereSignature = genrePass.atmosphereSignature;
  let typographySignature = genrePass.typographySignature;
  const ecology = genrePass.ecology;
  const eventOverlay = config._eventOverlay;
  const overlayStrength =
    config._eventOverlayStrength ?? DEFAULT_EVENT_OVERLAY_STRENGTH;
  const saturationBudget = resolveSaturationBudget(eventOverlay);

  const lighting = deriveAtmosphericLighting(
    input,
    config,
    atmosphereSignature.focalIntensity,
    atmosphereSignature.fogDensity,
    ecology,
  );
  const contrast = deriveAtmosphericContrast(
    input,
    atmosphereSignature.peripheryStrength,
    ecology,
  );
  const signatureVars = deriveAtmosphereSignatureCssVariables(
    atmosphereSignature,
    input.shadowTint,
    roles.canvasRgb,
    depth.depth1,
    depth.depth1Rgb,
    input.mode,
  );
  const typographyVars = deriveTypographySignatureCssVariables(
    typographySignature,
    focal.focalForeground,
    focal.focalMuted,
    input.mode,
  );
  const materialVars = scene
    ? {}
    : applyGenreMaterialTransforms(
        deriveMaterialZoneCssVariables({
          mode: input.mode,
          paletteId: config._paletteId,
        }),
        config._genre,
      );

  const usesNeutralDarkSlab =
    input.mode === 'dark' && (input.preset === 'dark' || isGenrePreset(input.preset));
  const legacyBg = usesNeutralDarkSlab ? roles.canvas : config.bg;
  const legacyElevated = usesNeutralDarkSlab ? roles.canvasElevated : config.bgElevated;
  const legacySurface = usesNeutralDarkSlab ? roles.surface : config.surface;
  const legacyBorder =
    input.mode === 'dark'
      ? `rgb(${roles.borderWarmRgb} / 0.08)`
      : config.border;

  const baseVars: Record<string, string> = {
    '--color-bg': legacyBg,
    '--color-bg-elevated': legacyElevated,
    '--color-surface': legacySurface,
    '--color-border': legacyBorder,
    '--color-canvas': roles.canvas,
    '--color-canvas-gradient-mid': roles.canvasGradientMid,
    '--color-canvas-gradient-warm': roles.canvasGradientWarm,
    '--color-focal': focal.focal,
    '--color-focal-elevated': focal.focalElevated,
    '--color-focal-foreground': focal.focalForeground,
    '--color-focal-muted': focal.focalMuted,
    '--color-focal-glow-rgb': focal.focalGlowRgb,
    '--color-depth-0': depth.depth0,
    '--color-depth-1': depth.depth1,
    '--color-depth-2': depth.depth2,
    '--color-depth-3': depth.depth3,
    '--color-depth-4': depth.depth4,
    '--color-depth-0-rgb': depth.depth0Rgb,
    '--color-depth-1-rgb': depth.depth1Rgb,
    '--color-depth-2-rgb': depth.depth2Rgb,
    '--color-depth-3-rgb': depth.depth3Rgb,
    '--color-contextual': contextual.contextual,
    '--color-contextual-foreground': contextual.contextualForeground,
    '--color-recessed-foreground': operational.recessed,
    '--color-operational-foreground': operational.operational,
    '--color-overlay-elevated': depth.depth4,
    '--color-border-rgb': roles.borderWarmRgb,
    '--color-border-warm-rgb': roles.borderWarmRgb,
    '--color-surface-rgb': roles.surfaceRgb,
    '--color-focal-rgb': focal.focalRgb,
    '--color-canvas-rgb': roles.canvasRgb,
    '--color-atmosphere-glow-rgb': lighting.atmosphereGlowRgb,
    '--color-atmosphere-shadow-rgb': lighting.atmosphereShadowRgb,
    '--color-atmosphere-haze-rgb': lighting.atmosphereHazeRgb,
    '--atmosphere-haze-alpha': lighting.atmosphereHazeAlpha,
    '--atmosphere-glow-alpha': lighting.atmosphereGlowAlphaOperational,
    '--atmosphere-glow-alpha-operational': lighting.atmosphereGlowAlphaOperational,
    '--atmosphere-glow-alpha-focal': lighting.atmosphereGlowAlphaFocal,
    '--atmosphere-glow-alpha-dramatic': lighting.atmosphereGlowAlphaDramatic,
    '--atmosphere-glow-alpha-sidebar': lighting.atmosphereGlowAlphaSidebar,
    '--atmosphere-glow-alpha-hero': lighting.atmosphereGlowAlphaHero,
    '--atmosphere-glow-alpha-rail': lighting.atmosphereGlowAlphaRail,
    '--atmosphere-region-fade-strength': contrast.regionFadeStrength,
    '--atmosphere-shadow-alpha': contrast.shadowAlpha,
    '--atmosphere-shadow-blur': contrast.shadowBlur,
    '--atmosphere-depth-edge-opacity': contrast.depthEdgeOpacity,
    '--atmosphere-vignette-strength': contrast.vignetteStrength,
    ...signatureVars,
    ...typographyVars,
    ...materialVars,
  };

  const sidebarNavVars = deriveSidebarNavCssVariables({
    paletteId: config._paletteId,
    signature: atmosphereSignature,
    typography: typographySignature,
    mode: input.mode,
    scene: null,
  });
  if (sidebarNavVars) {
    Object.assign(baseVars, sidebarNavVars);
  }

  if (eventOverlay) {
    const eventPass = modulateEventOverlay(
      atmosphereSignature,
      baseVars,
      eventOverlay,
      overlayStrength,
      saturationBudget,
    );
    atmosphereSignature = eventPass.signature;
    for (const [key, value] of Object.entries(eventPass.cssVars)) {
      if (
        key.startsWith('--atmosphere-glow-alpha') ||
        key.startsWith('--event-overlay') ||
        key.startsWith('--color-event-edge')
      ) {
        baseVars[key] = value;
      }
    }
  }

  if (scene) {
    const zoneVars = deriveZoneCssVariables(
      baseVars,
      scene,
      atmosphereSignature,
      { mode: input.mode, paletteId: config._paletteId, ecology },
    );
    const sceneNavVars = deriveSidebarNavCssVariables({
      paletteId: config._paletteId,
      signature: atmosphereSignature,
      typography: typographySignature,
      mode: input.mode,
      scene,
    });
    return {
      ...baseVars,
      ...zoneVars,
      ...(sceneNavVars ?? {}),
    };
  }

  return baseVars;
}

/** Relative luminance for contrast checks (sRGB). */
export function relativeLuminance(hex: string): number {
  const parts = parseHexColor(hex);
  if (!parts) return 0;
  const linear = parts.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function luminanceDelta(hexA: string, hexB: string): number {
  return Math.abs(relativeLuminance(hexA) - relativeLuminance(hexB));
}

/** HSL lightness delta — matches narrative luminance band targets in the design plan. */
export function lightnessDelta(hexA: string, hexB: string): number {
  const partsA = parseHexColor(hexA);
  const partsB = parseHexColor(hexB);
  if (!partsA || !partsB) return 0;
  const [, , lightnessA] = rgbToHsl(partsA[0], partsA[1], partsA[2]);
  const [, , lightnessB] = rgbToHsl(partsB[0], partsB[1], partsB[2]);
  return Math.abs(lightnessA - lightnessB);
}

/** HSL hue value (degrees) for palette drift checks. */
export function hexHue(hex: string): number {
  const parts = parseHexColor(hex);
  if (!parts) return 0;
  return rgbToHsl(parts[0], parts[1], parts[2])[0];
}

/** HSL saturation (0–1) for palette drift checks. */
export function hexSaturation(hex: string): number {
  const parts = parseHexColor(hex);
  if (!parts) return 0;
  return rgbToHsl(parts[0], parts[1], parts[2])[1];
}

/** Shortest angular distance between two hues in degrees. */
export function hueDeltaDegrees(hexA: string, hexB: string): number {
  const hueA = hexHue(hexA);
  const hueB = hexHue(hexB);
  const delta = Math.abs(hueA - hueB);
  return Math.min(delta, 360 - delta);
}
