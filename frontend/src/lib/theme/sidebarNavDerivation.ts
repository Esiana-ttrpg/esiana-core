import type { ThemeAtmosphereSignature } from './atmosphereSignature';
import type {
  DarkFoundationPaletteId,
  GlobalPaletteId,
  LightFoundationPaletteId,
} from './appearancePresets';
import {
  applyIlluminationCurve,
  applyIntensityCurve,
  type EmotionalCadence,
  type GlowTier,
} from './emotionalCurves';
import type { SceneCompositionProfile } from './sceneComposition';
import {
  isDarkFoundationPalette,
  isLightFoundationPalette,
  type SidebarAtmosphereRecipeId,
} from './sidebarAtmosphereRecipes';
import type { ThemeTypographySignature } from './typographySignature';

const DARK_SIDEBAR_NAV_ACTIVE_EDGE = '192 160 96';

interface SidebarNavInk {
  ink: string;
  inkHover: string;
  inkActive: string;
}

const DARK_PALETTE_INK: Record<DarkFoundationPaletteId, SidebarNavInk> = {
  midnight: {
    ink: '214 219 230',
    inkHover: '230 234 242',
    inkActive: '245 238 220',
  },
  ocean: {
    ink: '200 210 220',
    inkHover: '215 225 235',
    inkActive: '230 238 245',
  },
  ember: {
    ink: '210 200 188',
    inkHover: '225 215 200',
    inkActive: '245 238 220',
  },
  forest: {
    ink: '205 210 198',
    inkHover: '218 222 208',
    inkActive: '238 232 210',
  },
  deep_space: {
    ink: '200 205 215',
    inkHover: '212 218 228',
    inkActive: '230 232 238',
  },
};

const LIGHT_PALETTE_INK: Record<LightFoundationPaletteId, SidebarNavInk> = {
  sunset: {
    ink: '72 62 52',
    inkHover: '58 50 42',
    inkActive: '42 36 28',
  },
  desert: {
    ink: '78 68 56',
    inkHover: '62 54 44',
    inkActive: '48 40 32',
  },
  arctic: {
    ink: '68 72 78',
    inkHover: '52 56 62',
    inkActive: '38 42 48',
  },
};

interface SidebarNavAmplitude {
  fillStart: number;
  fillEnd: number;
  hoverFill: number;
  containerEdge: number;
  inactiveGlowTier: GlowTier;
  activeGlowTier: GlowTier;
}

const DARK_PALETTE_AMPLITUDE: Record<DarkFoundationPaletteId, SidebarNavAmplitude> =
  {
    midnight: {
      fillStart: 0.16,
      fillEnd: 0.04,
      hoverFill: 0.06,
      containerEdge: 0.18,
      inactiveGlowTier: 'medium',
      activeGlowTier: 'high',
    },
    ember: {
      fillStart: 0.18,
      fillEnd: 0.05,
      hoverFill: 0.07,
      containerEdge: 0.14,
      inactiveGlowTier: 'medium',
      activeGlowTier: 'high',
    },
    ocean: {
      fillStart: 0.12,
      fillEnd: 0.03,
      hoverFill: 0.05,
      containerEdge: 0.12,
      inactiveGlowTier: 'low',
      activeGlowTier: 'medium',
    },
    forest: {
      fillStart: 0.1,
      fillEnd: 0.03,
      hoverFill: 0.05,
      containerEdge: 0.1,
      inactiveGlowTier: 'low',
      activeGlowTier: 'medium',
    },
    deep_space: {
      fillStart: 0.08,
      fillEnd: 0.02,
      hoverFill: 0.04,
      containerEdge: 0.08,
      inactiveGlowTier: 'low',
      activeGlowTier: 'low',
    },
  };

const LIGHT_PALETTE_AMPLITUDE: Record<LightFoundationPaletteId, SidebarNavAmplitude> =
  {
    sunset: {
      fillStart: 0.1,
      fillEnd: 0.02,
      hoverFill: 0.04,
      containerEdge: 0.12,
      inactiveGlowTier: 'low',
      activeGlowTier: 'medium',
    },
    desert: {
      fillStart: 0.09,
      fillEnd: 0.02,
      hoverFill: 0.04,
      containerEdge: 0.11,
      inactiveGlowTier: 'low',
      activeGlowTier: 'medium',
    },
    arctic: {
      fillStart: 0.07,
      fillEnd: 0.015,
      hoverFill: 0.035,
      containerEdge: 0.09,
      inactiveGlowTier: 'low',
      activeGlowTier: 'medium',
    },
  };

function activeNavGlowTier(
  cadence: EmotionalCadence,
  baseTier: GlowTier,
  reflective: boolean,
): GlowTier {
  if (reflective) {
    if (cadence === 'cinematic') return baseTier === 'low' ? 'medium' : 'high';
    return baseTier;
  }
  if (cadence === 'restrained_spikes') return 'dramatic';
  if (cadence === 'cinematic') return 'dramatic';
  return baseTier === 'low' ? 'medium' : 'high';
}

export interface DeriveSidebarNavInput {
  paletteId: GlobalPaletteId | undefined;
  signature: ThemeAtmosphereSignature;
  typography: ThemeTypographySignature;
  mode: 'light' | 'dark';
  scene?: SceneCompositionProfile | null;
  edgeRgbOverride?: string;
}

export function deriveSidebarNavCssVariables(
  input: DeriveSidebarNavInput,
): Record<string, string> | null {
  const { paletteId, signature, mode, scene, edgeRgbOverride } = input;

  const isDark = mode === 'dark' && isDarkFoundationPalette(paletteId);
  const isLight = mode === 'light' && isLightFoundationPalette(paletteId);

  if (!isDark && !isLight) {
    return null;
  }

  const reflective = isLight;
  const ink = isDark
    ? DARK_PALETTE_INK[paletteId as DarkFoundationPaletteId]
    : LIGHT_PALETTE_INK[paletteId as LightFoundationPaletteId];
  const amplitude = isDark
    ? DARK_PALETTE_AMPLITUDE[paletteId as DarkFoundationPaletteId]
    : LIGHT_PALETTE_AMPLITUDE[paletteId as LightFoundationPaletteId];
  const cadence: EmotionalCadence = scene?.cadence ?? 'editorial';

  const inactiveTier = scene?.zones.sidebar.glowTier ?? amplitude.inactiveGlowTier;
  const activeTier = activeNavGlowTier(cadence, amplitude.activeGlowTier, reflective);

  const lightingModel = reflective ? 'reflective' : 'emissive';

  const inactiveGlow = reflective
    ? applyIlluminationCurve(1, inactiveTier, cadence)
    : applyIntensityCurve(1, inactiveTier, cadence, lightingModel);
  const activeGlow = reflective
    ? applyIlluminationCurve(1, activeTier, cadence)
    : applyIntensityCurve(1, activeTier, cadence, lightingModel);

  const fillStart = scene
    ? Math.min(reflective ? 0.14 : 0.22, amplitude.fillStart * 1.1)
    : amplitude.fillStart;

  const edgeRgb = edgeRgbOverride ?? signature.edgeLightRgb;
  const activeEdgeRgb = isLight ? edgeRgb : DARK_SIDEBAR_NAV_ACTIVE_EDGE;

  return {
    '--sidebar-nav-ink': ink.ink,
    '--sidebar-nav-ink-opacity': reflective ? '0.88' : '0.82',
    '--sidebar-nav-ink-hover': ink.inkHover,
    '--sidebar-nav-ink-hover-opacity': reflective ? '0.95' : '0.92',
    '--sidebar-nav-ink-active': ink.inkActive,
    '--sidebar-nav-edge-rgb': edgeRgb,
    '--sidebar-nav-active-edge-rgb': activeEdgeRgb,
    '--sidebar-nav-active-glow-alpha': activeGlow.toFixed(3),
    '--sidebar-nav-inactive-glow-alpha': inactiveGlow.toFixed(3),
    '--sidebar-nav-active-fill-start': fillStart.toFixed(3),
    '--sidebar-nav-active-fill-end': amplitude.fillEnd.toFixed(3),
    '--sidebar-nav-hover-fill-alpha': amplitude.hoverFill.toFixed(3),
    '--sidebar-nav-active-catch-alpha': reflective ? '0.06' : '0.04',
    '--sidebar-nav-container-edge-alpha': amplitude.containerEdge.toFixed(3),
  };
}

export type { SidebarAtmosphereRecipeId };
