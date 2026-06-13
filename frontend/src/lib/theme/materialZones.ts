import type { GlobalPaletteId } from './appearancePresets';
import { applyMaterialCurve } from './emotionalCurves';
import type { SceneCompositionProfile } from './sceneComposition';

/** Zone-scoped material response — specular/absorption/edge without fill tint. */

export interface MaterialZoneCssVariables {
  '--material-specular-hero': string;
  '--material-specular-silent': string;
  '--material-specular-float': string;
  '--material-specular-sidebar': string;
  '--material-absorption-void': string;
  '--material-absorption-lacquer': string;
  '--material-absorption-velvet': string;
  '--material-edge-sharpness-sidebar': string;
  '--material-edge-sharpness-card': string;
}

export interface MaterialZoneContext {
  mode: 'light' | 'dark';
  paletteId?: GlobalPaletteId;
  scene?: SceneCompositionProfile | null;
}

const DARK_BASE: MaterialZoneCssVariables = {
  '--material-specular-hero': '0.05',
  '--material-specular-silent': '0.01',
  '--material-specular-float': '0.03',
  '--material-specular-sidebar': '0.025',
  '--material-absorption-void': '1.2',
  '--material-absorption-lacquer': '0.85',
  '--material-absorption-velvet': '1.1',
  '--material-edge-sharpness-sidebar': '0.14',
  '--material-edge-sharpness-card': '0.09',
};

const LIGHT_BASE: MaterialZoneCssVariables = {
  '--material-specular-hero': '0.045',
  '--material-specular-silent': '0.008',
  '--material-specular-float': '0.025',
  '--material-specular-sidebar': '0.02',
  '--material-absorption-void': '0.95',
  '--material-absorption-lacquer': '0.75',
  '--material-absorption-velvet': '1.05',
  '--material-edge-sharpness-sidebar': '0.12',
  '--material-edge-sharpness-card': '0.08',
};

const MIDNIGHT_MATERIAL_SCALE = {
  hero: 1.1,
  silent: 0.85,
  float: 1.05,
  sidebar: 1.25,
  void: 1.3,
  lacquer: 0.9,
  velvet: 1.05,
  sidebarEdge: 1.2,
  cardEdge: 0.95,
};

function scaleMaterialValue(value: string, scale: number): string {
  return (Number(value) * scale).toFixed(3);
}

function applySceneMaterialOverrides(
  base: MaterialZoneCssVariables,
  scene: SceneCompositionProfile,
): MaterialZoneCssVariables {
  const { zones, cadence } = scene;

  const heroSpecular = applyMaterialCurve(
    Number(base['--material-specular-hero']),
    zones.hero.glowTier,
    cadence,
  );
  const silentSpecular = zones.prose.silence
    ? zones.prose.specularScale
    : applyMaterialCurve(
        Number(base['--material-specular-silent']),
        zones.prose.glowTier,
        cadence,
      );
  const floatSpecular = applyMaterialCurve(
    Number(base['--material-specular-float']),
    zones.float.glowTier,
    cadence,
  );
  const sidebarSpecular = applyMaterialCurve(
    Number(base['--material-specular-sidebar']),
    zones.sidebar.glowTier,
    cadence,
  );

  return {
    '--material-specular-hero': heroSpecular.toFixed(3),
    '--material-specular-silent': silentSpecular.toFixed(3),
    '--material-specular-float': floatSpecular.toFixed(3),
    '--material-specular-sidebar': sidebarSpecular.toFixed(3),
    '--material-absorption-void': (
      Number(base['--material-absorption-void']) * zones.void.absorptionScale
    ).toFixed(3),
    '--material-absorption-lacquer': (
      Number(base['--material-absorption-lacquer']) * zones.chrome.absorptionScale
    ).toFixed(3),
    '--material-absorption-velvet': (
      Number(base['--material-absorption-velvet']) * zones.prose.absorptionScale
    ).toFixed(3),
    '--material-edge-sharpness-sidebar': (
      Number(base['--material-edge-sharpness-sidebar']) *
      zones.sidebar.edgeLightScale
    ).toFixed(3),
    '--material-edge-sharpness-card': (
      Number(base['--material-edge-sharpness-card']) * zones.float.edgeLightScale
    ).toFixed(3),
  };
}

export function deriveMaterialZoneCssVariables(
  modeOrContext: 'light' | 'dark' | MaterialZoneContext,
): MaterialZoneCssVariables {
  const context: MaterialZoneContext =
    typeof modeOrContext === 'string'
      ? { mode: modeOrContext }
      : modeOrContext;

  let base = context.mode === 'light' ? LIGHT_BASE : DARK_BASE;

  if (context.paletteId === 'midnight' && context.mode === 'dark') {
    base = {
      '--material-specular-hero': scaleMaterialValue(
        base['--material-specular-hero'],
        MIDNIGHT_MATERIAL_SCALE.hero,
      ),
      '--material-specular-silent': scaleMaterialValue(
        base['--material-specular-silent'],
        MIDNIGHT_MATERIAL_SCALE.silent,
      ),
      '--material-specular-float': scaleMaterialValue(
        base['--material-specular-float'],
        MIDNIGHT_MATERIAL_SCALE.float,
      ),
      '--material-specular-sidebar': scaleMaterialValue(
        base['--material-specular-sidebar'],
        MIDNIGHT_MATERIAL_SCALE.sidebar,
      ),
      '--material-absorption-void': scaleMaterialValue(
        base['--material-absorption-void'],
        MIDNIGHT_MATERIAL_SCALE.void,
      ),
      '--material-absorption-lacquer': scaleMaterialValue(
        base['--material-absorption-lacquer'],
        MIDNIGHT_MATERIAL_SCALE.lacquer,
      ),
      '--material-absorption-velvet': scaleMaterialValue(
        base['--material-absorption-velvet'],
        MIDNIGHT_MATERIAL_SCALE.velvet,
      ),
      '--material-edge-sharpness-sidebar': scaleMaterialValue(
        base['--material-edge-sharpness-sidebar'],
        MIDNIGHT_MATERIAL_SCALE.sidebarEdge,
      ),
      '--material-edge-sharpness-card': scaleMaterialValue(
        base['--material-edge-sharpness-card'],
        MIDNIGHT_MATERIAL_SCALE.cardEdge,
      ),
    };
  }

  if (context.scene) {
    return applySceneMaterialOverrides(base, context.scene);
  }

  return base;
}
