import type { GenreId } from './appearancePresets';
import type { AtmosphericIdentity } from './appearancePresets';
import type { ThemeAtmosphereSignature } from './atmosphereSignature';
import type { ThemeTypographySignature } from './typographySignature';
import type { LuminanceEcology } from './luminanceEcology';
import type { GlobalPaletteId } from './appearancePresets';
import { resolveLuminanceEcology } from './luminanceEcology';
import type { MaterialZoneCssVariables } from './materialZones';

export type MotionCadenceId = 'drift' | 'reactive' | 'minimal';

export interface GenreIdentity {
  id: Exclude<GenreId, 'none'>;
  atmosphereRecipe: 'fantasy_mythic' | 'cyberpunk_infrastructure' | 'parchment_editorial';
  motionCadence: MotionCadenceId;
}

/** Environmental lighting blend targets — migrated from atmosphericDerivation. */
export const GENRE_ENVIRONMENTAL: Record<
  'fantasy' | 'cyberpunk',
  Pick<AtmosphericIdentity, 'ambientHue' | 'shadowTint' | 'glowTint' | 'hazeTint'>
> = {
  fantasy: {
    ambientHue: 265,
    shadowTint: '12 10 18',
    glowTint: '90 75 130',
    hazeTint: '70 55 110',
  },
  cyberpunk: {
    ambientHue: 195,
    shadowTint: '4 6 14',
    glowTint: '34 211 238',
    hazeTint: '35 45 90',
  },
};

export const GENRE_REGISTRY: Record<Exclude<GenreId, 'none'>, GenreIdentity> = {
  fantasy: {
    id: 'fantasy',
    atmosphereRecipe: 'fantasy_mythic',
    motionCadence: 'drift',
  },
  cyberpunk: {
    id: 'cyberpunk',
    atmosphereRecipe: 'cyberpunk_infrastructure',
    motionCadence: 'reactive',
  },
  parchment: {
    id: 'parchment',
    atmosphereRecipe: 'parchment_editorial',
    motionCadence: 'minimal',
  },
};

function blendRgbTint(a: string, b: string, weight: number): string {
  const left = a.split(' ').map(Number);
  const right = b.split(' ').map(Number);
  return left
    .map((channel, index) =>
      Math.round(channel * (1 - weight) + (right[index] ?? channel) * weight),
    )
    .join(' ');
}

function blendHueDegreesLocal(baseHue: number, targetHue: number, weight: number): number {
  const delta = ((targetHue - baseHue + 540) % 360) - 180;
  return (baseHue + delta * weight + 360) % 360;
}

/** Blend foundation atmospheric identity with genre environmental channel — not slab recolor. */
export function blendGenreEnvironmentalIdentity(
  base: AtmosphericIdentity,
  genre: GenreId | undefined,
): AtmosphericIdentity {
  if (genre !== 'fantasy' && genre !== 'cyberpunk') return base;
  const env = GENRE_ENVIRONMENTAL[genre];
  return {
    ...base,
    ambientHue: blendHueDegreesLocal(base.ambientHue, env.ambientHue, 0.35),
    glowTint: blendRgbTint(base.glowTint, env.glowTint, 0.25),
    hazeTint: blendRgbTint(base.hazeTint, env.hazeTint, 0.2),
    shadowTint: blendRgbTint(base.shadowTint, env.shadowTint, 0.15),
  };
}

export interface GenreGlowCurveInput {
  operational: number;
  focal: number;
  dramatic: number;
  sidebar: number;
  hero: number;
}

/** Remap glow tier alphas per genre — behavioral curve transform, not RGB lerp. */
export function applyGenreGlowCurve(
  tiers: GenreGlowCurveInput,
  genre: GenreId | undefined,
): GenreGlowCurveInput {
  if (!genre || genre === 'none') return tiers;
  switch (genre) {
    case 'fantasy':
      return {
        operational: tiers.operational * 1.05,
        focal: tiers.focal * 1.1,
        dramatic: tiers.dramatic * 1.08,
        sidebar: tiers.sidebar * 1.06,
        hero: tiers.hero * 1.12,
      };
    case 'cyberpunk':
      return {
        operational: tiers.operational * 0.95,
        focal: tiers.focal * 1.05,
        dramatic: Math.min(0.22, tiers.dramatic * 1.2),
        sidebar: tiers.sidebar * 1.1,
        hero: Math.min(0.22, tiers.hero * 1.15),
      };
    case 'parchment':
      return {
        operational: tiers.operational * 0.88,
        focal: tiers.focal * 0.92,
        dramatic: tiers.dramatic * 0.85,
        sidebar: tiers.sidebar * 0.9,
        hero: tiers.hero * 0.88,
      };
    default:
      return tiers;
  }
}

function scaleMaterial(value: string, scale: number): string {
  return (Number(value) * scale).toFixed(3);
}

/** Genre material response — sharp lacquer vs fibrous editorial. */
export function applyGenreMaterialTransforms(
  base: MaterialZoneCssVariables,
  genre: GenreId | undefined,
): MaterialZoneCssVariables {
  if (!genre || genre === 'none') return base;
  switch (genre) {
    case 'cyberpunk':
      return {
        ...base,
        '--material-edge-sharpness-sidebar': scaleMaterial(
          base['--material-edge-sharpness-sidebar'],
          1.25,
        ),
        '--material-edge-sharpness-card': scaleMaterial(
          base['--material-edge-sharpness-card'],
          1.2,
        ),
        '--material-absorption-void': scaleMaterial(base['--material-absorption-void'], 1.1),
      };
    case 'fantasy':
      return {
        ...base,
        '--material-absorption-velvet': scaleMaterial(
          base['--material-absorption-velvet'],
          1.08,
        ),
        '--material-specular-hero': scaleMaterial(base['--material-specular-hero'], 1.06),
      };
    case 'parchment':
      return {
        ...base,
        '--material-absorption-lacquer': scaleMaterial(
          base['--material-absorption-lacquer'],
          0.82,
        ),
        '--material-specular-silent': scaleMaterial(base['--material-specular-silent'], 1.15),
        '--material-edge-sharpness-card': scaleMaterial(
          base['--material-edge-sharpness-card'],
          0.85,
        ),
      };
    default:
      return base;
  }
}

export interface GenreTransformResult {
  atmosphereSignature: ThemeAtmosphereSignature;
  typographySignature: ThemeTypographySignature;
  ecology: LuminanceEcology;
}

/** Unified genre transform pass — atmosphere, typography, ecology. */
export function applyGenreTransforms(
  atmosphereSignature: ThemeAtmosphereSignature,
  typographySignature: ThemeTypographySignature,
  mode: 'light' | 'dark',
  foundationPalette: GlobalPaletteId | undefined,
  genre: GenreId | undefined,
): GenreTransformResult {
  return {
    atmosphereSignature: applyGenreAtmosphereTransforms(atmosphereSignature, genre),
    typographySignature: mergeTypographyMood(typographySignature, genre),
    ecology: resolveEcologyForStack(mode, foundationPalette, genre),
  };
}

/** Behavioral atmosphere mutations — not RGB lerp. */
export function applyGenreAtmosphereTransforms(
  base: ThemeAtmosphereSignature,
  genre: GenreId | undefined,
): ThemeAtmosphereSignature {
  if (!genre || genre === 'none') return base;

  switch (genre) {
    case 'fantasy':
      return {
        ...base,
        bloomBehavior: 'peripheral_moonlit',
        gradientBehavior: 'periphery_violet',
        fogDensity: Math.min(1.4, base.fogDensity * 1.12),
        peripheryStrength: Math.min(1, base.peripheryStrength * 1.15),
        atmosphericAmplitude: Math.min(1.5, base.atmosphericAmplitude * 1.2),
        edgeLightAlpha: Math.min(0.12, base.edgeLightAlpha * 0.95),
        sidebarEdgeLightAlpha: Math.min(0.16, base.sidebarEdgeLightAlpha * 1.05),
        eventEscalationCurve: 'soft',
      };
    case 'cyberpunk':
      return {
        ...base,
        edgeLightRgb: '34 211 238',
        edgeLightAlpha: Math.min(0.14, Math.max(base.edgeLightAlpha, 0.08)),
        sidebarEdgeLightAlpha: Math.min(0.2, base.sidebarEdgeLightAlpha * 1.25),
        bloomBehavior: 'pulse_magical',
        gradientBehavior: 'horizon_fog',
        focalIntensity: Math.min(1.35, base.focalIntensity * 1.15),
        peripheryStrength: Math.min(1, base.peripheryStrength * 0.92),
        atmosphericAmplitude: Math.min(1.4, base.atmosphericAmplitude * 1.1),
        compositionBias: {
          ...base.compositionBias,
          horizontalBias: 1,
          verticalBias: -1,
          warmCorner: 'none',
          coldCorner: 'tr',
        },
        eventEscalationCurve: 'dramatic',
      };
    case 'parchment':
      return {
        ...base,
        bloomBehavior: 'desaturated_dust',
        gradientBehavior: 'void_vignette',
        peripheryStrength: Math.max(0.35, base.peripheryStrength * 0.85),
        fogDensity: Math.max(0.7, base.fogDensity * 0.88),
        atmosphericAmplitude: Math.max(0.85, base.atmosphericAmplitude * 0.9),
        eventEscalationCurve: 'linear',
      };
    default:
      return base;
  }
}

export function mergeTypographyMood(
  base: ThemeTypographySignature,
  genre: GenreId | undefined,
): ThemeTypographySignature {
  if (!genre || genre === 'none') return base;

  switch (genre) {
    case 'fantasy':
      return {
        ...base,
        headingTracking: 'lunar',
        serifDisplay: true,
        proseLineHeight: Math.min(1.75, base.proseLineHeight + 0.04),
        spacingCadence: 'airy',
        quoteStyle: 'literary',
      };
    case 'cyberpunk':
      return {
        ...base,
        headingTracking: 'tight',
        headingWeightBias: base.headingWeightBias - 0.08,
        serifDisplay: false,
        proseLineHeight: Math.max(1.55, base.proseLineHeight - 0.06),
        spacingCadence: 'dense',
        quoteStyle: 'minimal',
      };
    case 'parchment':
      return {
        ...base,
        headingTone: 'warm_ivory',
        headingTracking: 'normal',
        proseWarmth: Math.max(base.proseWarmth, 0.45),
        proseLineHeight: 1.68,
        spacingCadence: 'airy',
      };
    default:
      return base;
  }
}

/** Parchment forces reflective ecology even on dark-adjacent foundation presets. */
export function resolveEcologyForStack(
  mode: 'light' | 'dark',
  foundationPalette: GlobalPaletteId | undefined,
  genre: GenreId | undefined,
): LuminanceEcology {
  if (genre === 'parchment') {
    return {
      mode: 'light',
      lightingModel: 'reflective',
      contrastModel: 'paper_recession',
      atmosphereModel: 'diffused',
      materialModel: 'fibrous',
      sidebarEcology: 'sunlit',
    };
  }
  if (genre === 'fantasy' || genre === 'cyberpunk') {
    const ecology = resolveLuminanceEcology(mode, foundationPalette);
    if (ecology.sidebarEcology) return ecology;
    return { ...ecology, sidebarEcology: 'atmospheric' };
  }
  return resolveLuminanceEcology(mode, foundationPalette);
}
