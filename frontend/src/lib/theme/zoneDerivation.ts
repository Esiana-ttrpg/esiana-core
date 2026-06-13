import type { ThemeAtmosphereSignature } from './atmosphereSignature';
import type { GlobalPaletteId } from './appearancePresets';
import {
  applyIntensityCurve,
  applyMaterialCurve,
  type EmotionalCadence,
} from './emotionalCurves';
import type { LuminanceEcology } from './luminanceEcology';
import { resolveLuminanceEcology } from './luminanceEcology';
import {
  deriveMaterialZoneCssVariables,
  type MaterialZoneContext,
} from './materialZones';
import type { SceneCompositionProfile, RenderZone } from './sceneComposition';

const ZONE_CSS_PREFIX: Record<RenderZone, string> = {
  sidebar: 'sidebar',
  hero: 'hero',
  prose: 'prose',
  contextRail: 'rail',
  void: 'void',
  float: 'float',
  chrome: 'chrome',
};

export interface ZoneDerivationContext {
  mode: 'light' | 'dark';
  paletteId?: GlobalPaletteId;
  ecology?: LuminanceEcology;
}

function deriveZoneGlowAlpha(
  globalGlowKey: string,
  globalVars: Record<string, string>,
  zoneProfile: SceneCompositionProfile['zones'][RenderZone],
  cadence: EmotionalCadence,
  lightingModel: LuminanceEcology['lightingModel'],
): string {
  const base = Number(globalVars[globalGlowKey] ?? '0.08');
  const value = zoneProfile.silence
    ? 0
    : applyIntensityCurve(base, zoneProfile.glowTier, cadence, lightingModel);
  return value.toFixed(3);
}

function deriveZoneSpecular(
  baseSpecular: number,
  zoneProfile: SceneCompositionProfile['zones'][RenderZone],
  cadence: EmotionalCadence,
): string {
  if (zoneProfile.silence) {
    return zoneProfile.specularScale.toFixed(3);
  }
  const curved = applyMaterialCurve(baseSpecular, zoneProfile.glowTier, cadence);
  return (curved * zoneProfile.specularScale * 10).toFixed(3);
}

/** Fork global derivation into zone-scoped CSS variables. */
export function deriveZoneCssVariables(
  globalVars: Record<string, string>,
  scene: SceneCompositionProfile,
  signature: ThemeAtmosphereSignature,
  context?: ZoneDerivationContext,
): Record<string, string> {
  const { cadence, zones, authored } = scene;
  const vars: Record<string, string> = {};
  const mode = context?.mode ?? 'dark';
  const ecology =
    context?.ecology ?? resolveLuminanceEcology(mode, context?.paletteId);

  const globalHeroGlow = globalVars['--atmosphere-glow-alpha-hero'] ?? '0.12';
  const globalSidebarGlow = globalVars['--atmosphere-glow-alpha-sidebar'] ?? '0.08';
  const globalRailGlow = globalVars['--atmosphere-glow-alpha-rail'] ?? '0.06';
  const globalEdgeAlpha = signature.edgeLightAlpha;

  for (const zone of Object.keys(zones) as RenderZone[]) {
    const prefix = ZONE_CSS_PREFIX[zone];
    const profile = zones[zone];

    let glowBaseKey = '--atmosphere-glow-alpha-operational';
    if (zone === 'hero') glowBaseKey = '--atmosphere-glow-alpha-hero';
    else if (zone === 'sidebar') glowBaseKey = '--atmosphere-glow-alpha-sidebar';
    else if (zone === 'contextRail') glowBaseKey = '--atmosphere-glow-alpha-rail';
    else if (zone === 'prose') glowBaseKey = '--atmosphere-glow-alpha-focal';

    vars[`--zone-${prefix}-glow-alpha`] = deriveZoneGlowAlpha(
      glowBaseKey,
      globalVars,
      profile,
      cadence,
      ecology.lightingModel,
    );

    const baseSpecular = zone === 'hero' ? 0.05 : zone === 'prose' ? 0.01 : 0.025;
    vars[`--zone-${prefix}-specular`] = deriveZoneSpecular(
      baseSpecular,
      profile,
      cadence,
    );

    vars[`--zone-${prefix}-absorption`] = profile.absorptionScale.toFixed(3);
    vars[`--zone-${prefix}-edge-light`] = (
      globalEdgeAlpha * profile.edgeLightScale
    ).toFixed(3);
    vars[`--zone-${prefix}-luminance-offset`] = profile.luminanceOffset.toFixed(3);

    if (profile.silence) {
      vars[`--zone-${prefix}-silence`] = '1';
    }
  }

  if (authored?.voidRatio !== undefined) {
    vars['--scene-void-ratio'] = authored.voidRatio.toFixed(3);
  }
  if (authored?.heroBleed !== undefined) {
    vars['--scene-hero-bleed'] = authored.heroBleed.toFixed(3);
  }
  if (authored?.proseFlatness !== undefined) {
    vars['--scene-prose-flatness'] = String(authored.proseFlatness);
  }

  if (scene.layoutOverrides?.negativeSpaceScale !== undefined) {
    vars['--scene-negative-space-scale'] = String(
      scene.layoutOverrides.negativeSpaceScale,
    );
  }
  if (scene.layoutOverrides?.focalColumnRatio !== undefined) {
    vars['--scene-focal-column-ratio'] = String(
      scene.layoutOverrides.focalColumnRatio,
    );
  }
  if (scene.layoutOverrides?.contextualRecess !== undefined) {
    vars['--scene-contextual-recess'] = String(
      scene.layoutOverrides.contextualRecess,
    );
  }

  vars['--zone-hero-glow-alpha-baseline'] = globalHeroGlow;
  vars['--zone-sidebar-glow-alpha-baseline'] = globalSidebarGlow;
  vars['--zone-rail-glow-alpha-baseline'] = globalRailGlow;

  const materialContext: MaterialZoneContext = {
    mode,
    paletteId: context?.paletteId,
    scene,
  };
  const materialVars = deriveMaterialZoneCssVariables(materialContext);
  Object.assign(vars, materialVars);

  return vars;
}
