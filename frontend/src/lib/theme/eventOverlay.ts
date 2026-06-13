import type { IdentityId } from './appearancePresets';
import type { ThemeAtmosphereSignature } from './atmosphereSignature';
import { clampChroma, type SaturationBudget } from './saturationBudget';

export type EventPermittedZone = 'hero' | 'sidebarEdge' | 'float' | 'hover';

export type ChromaChoreographyId =
  | 'aurora_edge'
  | 'celebratory_diffusion'
  | 'void_moonlit'
  | 'candlelit_evergreen';

export interface EventOverlayDefinition {
  id: Exclude<IdentityId, 'none'>;
  chromaChoreography: ChromaChoreographyId;
  overlayStrength: number;
  permittedZones: EventPermittedZone[];
  edgeBoost: number;
  heroGlowBoost: number;
  peripheryBoost: number;
  fogBoost: number;
  edgeLightRgb: string;
}

export const EVENT_REGISTRY: Record<Exclude<IdentityId, 'none'>, EventOverlayDefinition> = {
  trans: {
    id: 'trans',
    chromaChoreography: 'aurora_edge',
    overlayStrength: 0.22,
    permittedZones: ['hero', 'sidebarEdge', 'hover'],
    edgeLightRgb: '90 180 220',
    edgeBoost: 1.2,
    heroGlowBoost: 1.15,
    peripheryBoost: 1.1,
    fogBoost: 1.05,
  },
  pride: {
    id: 'pride',
    chromaChoreography: 'celebratory_diffusion',
    overlayStrength: 0.22,
    permittedZones: ['hero', 'float', 'hover'],
    edgeLightRgb: '200 80 100',
    edgeBoost: 1.0,
    heroGlowBoost: 1.35,
    peripheryBoost: 1.25,
    fogBoost: 1.1,
  },
  halloween: {
    id: 'halloween',
    chromaChoreography: 'void_moonlit',
    overlayStrength: 0.22,
    permittedZones: ['hero', 'sidebarEdge', 'hover'],
    edgeLightRgb: '160 80 40',
    edgeBoost: 1.3,
    heroGlowBoost: 1.1,
    peripheryBoost: 1.05,
    fogBoost: 1.2,
  },
  christmas: {
    id: 'christmas',
    chromaChoreography: 'candlelit_evergreen',
    overlayStrength: 0.22,
    permittedZones: ['hero', 'sidebarEdge', 'float'],
    edgeLightRgb: '40 100 60',
    edgeBoost: 1.1,
    heroGlowBoost: 1.2,
    peripheryBoost: 1.15,
    fogBoost: 1.08,
  },
};

export function modulateEventAtmosphereSignature(
  signature: ThemeAtmosphereSignature,
  eventOverlay: IdentityId | undefined,
  strength: number,
  budget: SaturationBudget,
): ThemeAtmosphereSignature {
  if (!eventOverlay || eventOverlay === 'none') return signature;

  const event = EVENT_REGISTRY[eventOverlay];
  const overlayStrength = clampChroma('overlay', strength, budget);

  return {
    ...signature,
    edgeLightRgb: event.edgeLightRgb,
    edgeLightAlpha: clampChroma(
      'sidebar',
      signature.edgeLightAlpha * event.edgeBoost * (1 + overlayStrength * 0.35),
      budget,
    ),
    sidebarEdgeLightAlpha: clampChroma(
      'sidebar',
      signature.sidebarEdgeLightAlpha * event.edgeBoost * (1 + overlayStrength * 0.25),
      budget,
    ),
    peripheryStrength: clampChroma(
      'hero',
      signature.peripheryStrength * event.peripheryBoost * (1 + overlayStrength * 0.2),
      budget,
    ),
    fogDensity: signature.fogDensity * (1 + (event.fogBoost - 1) * overlayStrength),
    atmosphericAmplitude: Math.min(
      1.45,
      signature.atmosphericAmplitude * (1 + 0.08 * overlayStrength),
    ),
  };
}

/** Modulate lighting-channel CSS vars only — never canvas or prose tokens. */
export function modulateEventLightingVars(
  vars: Record<string, string>,
  eventOverlay: IdentityId | undefined,
  strength: number,
  budget: SaturationBudget,
): Record<string, string> {
  if (!eventOverlay || eventOverlay === 'none') return vars;

  const event = EVENT_REGISTRY[eventOverlay];
  const overlayStrength = clampChroma('overlay', strength, budget);

  const heroAlpha = Number(
    vars['--atmosphere-glow-alpha-hero'] ??
      vars['--atmosphere-glow-alpha-dramatic'] ??
      0.16,
  );
  const dramaticAlpha = Number(vars['--atmosphere-glow-alpha-dramatic'] ?? 0.19);
  const sidebarAlpha = Number(vars['--atmosphere-glow-alpha-sidebar'] ?? 0.08);

  const boostedHero = clampChroma(
    'hero',
    heroAlpha * event.heroGlowBoost * (1 + overlayStrength * 0.4),
    budget,
  );
  const boostedDramatic = clampChroma(
    'hero',
    dramaticAlpha * (1 + (event.heroGlowBoost - 1) * overlayStrength),
    budget,
  );
  const boostedSidebar = clampChroma(
    'sidebar',
    sidebarAlpha * (1 + (event.edgeBoost - 1) * overlayStrength * 0.3),
    budget,
  );

  const result: Record<string, string> = {
    ...vars,
    '--atmosphere-glow-alpha-hero': boostedHero.toFixed(3),
    '--atmosphere-glow-alpha-dramatic': boostedDramatic.toFixed(3),
    '--atmosphere-glow-alpha-sidebar': boostedSidebar.toFixed(3),
    '--event-overlay-strength': overlayStrength.toFixed(3),
    '--color-event-edge-rgb': event.edgeLightRgb,
  };

  if (eventOverlay === 'trans') {
    result['--color-event-atmosphere-rgb'] = '247 168 184';
  }

  return result;
}

export interface ModulateEventOverlayResult {
  signature: ThemeAtmosphereSignature;
  cssVars: Record<string, string>;
}

/** Event overlay pass — signature + glow-channel modulation with saturation budget. */
export function modulateEventOverlay(
  signature: ThemeAtmosphereSignature,
  cssVars: Record<string, string>,
  eventOverlay: IdentityId | undefined,
  strength: number,
  budget: SaturationBudget,
): ModulateEventOverlayResult {
  if (!eventOverlay || eventOverlay === 'none') {
    return { signature, cssVars };
  }
  return {
    signature: modulateEventAtmosphereSignature(
      signature,
      eventOverlay,
      strength,
      budget,
    ),
    cssVars: modulateEventLightingVars(cssVars, eventOverlay, strength, budget),
  };
}
