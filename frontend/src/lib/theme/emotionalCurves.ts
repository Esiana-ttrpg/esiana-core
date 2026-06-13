import type { LightingModel } from './luminanceEcology';

/** Nonlinear emotional intensity — threshold curves, not proportional scaling. */

export type EmotionalCadence =
  | 'restrained_spikes'
  | 'editorial'
  | 'cinematic'
  | 'operational';

export type GlowTier = 'zero' | 'low' | 'medium' | 'high' | 'dramatic';

const TIER_CURVES: Record<EmotionalCadence, Record<GlowTier, number>> = {
  restrained_spikes: {
    zero: 0,
    low: 0.04,
    medium: 0.08,
    high: 0.22,
    dramatic: 0.45,
  },
  editorial: {
    zero: 0,
    low: 0.02,
    medium: 0.05,
    high: 0.12,
    dramatic: 0.2,
  },
  cinematic: {
    zero: 0,
    low: 0.06,
    medium: 0.14,
    high: 0.3,
    dramatic: 0.55,
  },
  operational: {
    zero: 0,
    low: 0.03,
    medium: 0.06,
    high: 0.1,
    dramatic: 0.15,
  },
};

/** Reflective light-mode wash curve — much lower ceiling than emissive glow. */
const ILLUMINATION_CURVES: Record<EmotionalCadence, Record<GlowTier, number>> = {
  restrained_spikes: {
    zero: 0,
    low: 0.015,
    medium: 0.025,
    high: 0.05,
    dramatic: 0.08,
  },
  editorial: {
    zero: 0,
    low: 0.01,
    medium: 0.02,
    high: 0.04,
    dramatic: 0.06,
  },
  cinematic: {
    zero: 0,
    low: 0.02,
    medium: 0.035,
    high: 0.055,
    dramatic: 0.08,
  },
  operational: {
    zero: 0,
    low: 0.012,
    medium: 0.022,
    high: 0.035,
    dramatic: 0.05,
  },
};

function curveForLightingModel(
  lightingModel: LightingModel,
  cadence: EmotionalCadence,
): Record<GlowTier, number> {
  return lightingModel === 'reflective' ? ILLUMINATION_CURVES[cadence] : TIER_CURVES[cadence];
}

/**
 * Map a zone glow tier to a nonlinear intensity value.
 * `base` (0–1) provides slight modulation; tier drives the threshold step.
 */
export function applyEmotionalCurve(
  base: number,
  zoneTier: GlowTier,
  cadence: EmotionalCadence,
  lightingModel: LightingModel = 'emissive',
): number {
  if (zoneTier === 'zero') return 0;
  const tierValue = curveForLightingModel(lightingModel, cadence)[zoneTier];
  const clampedBase = Math.max(0, Math.min(1, base));
  return Math.min(1, tierValue * (0.85 + clampedBase * 0.15));
}

/** Reflective illumination curve for sunlit editorial archive. */
export function applyIlluminationCurve(
  base: number,
  zoneTier: GlowTier,
  cadence: EmotionalCadence,
): number {
  return applyEmotionalCurve(base, zoneTier, cadence, 'reflective');
}

export function applyIntensityCurve(
  base: number,
  zoneTier: GlowTier,
  cadence: EmotionalCadence,
  lightingModel: LightingModel,
): number {
  return applyEmotionalCurve(base, zoneTier, cadence, lightingModel);
}

/** Specular/absorption scalars use a separate nonlinear ladder. */
export function applyMaterialCurve(
  base: number,
  zoneTier: GlowTier,
  cadence: EmotionalCadence,
): number {
  const glow = applyEmotionalCurve(base, zoneTier, cadence);
  if (zoneTier === 'zero') return Math.max(0.004, base * 0.008);
  return Math.max(0.01, glow * 0.12);
}

export function tierRank(tier: GlowTier): number {
  const ranks: Record<GlowTier, number> = {
    zero: 0,
    low: 1,
    medium: 2,
    high: 3,
    dramatic: 4,
  };
  return ranks[tier];
}
