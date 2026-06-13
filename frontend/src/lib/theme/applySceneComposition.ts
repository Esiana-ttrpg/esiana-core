import { resolveAtmosphereSignature } from './atmosphereSignature';
import { resolveThemeAtmosphereInput } from './atmosphericDerivation';
import {
  sceneDataAttributes,
  type SceneCompositionProfile,
} from './sceneComposition';
import { resolveLuminanceEcology } from './luminanceEcology';
import { deriveSidebarNavCssVariables } from './sidebarNavDerivation';
import type { ThemeConfig } from './themeTypes';
import { resolveTypographySignature } from './typographySignature';
import { themeConfigToCssVariables } from './themeVariables';
import { deriveZoneCssVariables } from './zoneDerivation';

const SCENE_ZONE_VAR_PREFIXES = ['--zone-', '--scene-'] as const;

const SCENE_DATA_KEYS = [
  'scene',
  'emotionalCadence',
  'sceneEdgeBias',
  'sceneFocusGravity',
  'sceneHeroGradient',
  'sceneSidebarAtmosphere',
] as const;

function collectGlobalVarsFromRoot(): Record<string, string> {
  const root = document.documentElement;
  const style = root.style;
  const vars: Record<string, string> = {};
  for (let i = 0; i < style.length; i += 1) {
    const name = style[i];
    if (
      name.startsWith('--') &&
      !SCENE_ZONE_VAR_PREFIXES.some((prefix) => name.startsWith(prefix))
    ) {
      vars[name] = style.getPropertyValue(name).trim();
    }
  }
  return vars;
}

function clearSceneZoneVariables(): void {
  const root = document.documentElement;
  const style = root.style;
  const toRemove: string[] = [];
  for (let i = 0; i < style.length; i += 1) {
    const name = style[i];
    if (SCENE_ZONE_VAR_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      toRemove.push(name);
    }
  }
  for (const name of toRemove) {
    root.style.removeProperty(name);
  }
}

function clearSceneDataAttributes(): void {
  const root = document.documentElement;
  for (const key of SCENE_DATA_KEYS) {
    delete root.dataset[key];
  }
}

/** Apply or clear scene-scoped zone variables and data attributes on :root. */
export function applySceneComposition(
  scene: SceneCompositionProfile | null,
  themeConfig?: ThemeConfig,
): void {
  const root = document.documentElement;

  clearSceneZoneVariables();
  clearSceneDataAttributes();

  if (!scene) {
    syncSidebarNavVariables(null, themeConfig);
    return;
  }

  const preset = themeConfig?._derivationPreset ?? 'dark';
  const input = themeConfig
    ? resolveThemeAtmosphereInput(themeConfig, preset)
    : null;
  const signature = resolveAtmosphereSignature(
    themeConfig?._paletteId,
    preset,
    input?.shadowTint ?? '30 27 75',
    input?.identityStrength ?? 1,
  );

  const baseVars = themeConfig
    ? themeConfigToCssVariables(themeConfig)
    : collectGlobalVarsFromRoot();

  const zoneVars = deriveZoneCssVariables(baseVars, scene, signature, {
    mode: input?.mode ?? 'dark',
    paletteId: themeConfig?._paletteId,
    ecology: resolveLuminanceEcology(input?.mode ?? 'dark', themeConfig?._paletteId),
  });

  for (const [key, value] of Object.entries(zoneVars)) {
    root.style.setProperty(key, value);
  }

  const attrs = sceneDataAttributes(scene);
  for (const [attr, value] of Object.entries(attrs)) {
    const datasetKey = attr
      .replace(/^data-/, '')
      .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    root.dataset[datasetKey as keyof DOMStringMap] = value;
  }

  syncSidebarNavVariables(scene, themeConfig);
}

function syncSidebarNavVariables(
  scene: SceneCompositionProfile | null,
  themeConfig?: ThemeConfig,
): void {
  if (!themeConfig) return;

  const preset = themeConfig._derivationPreset ?? 'dark';
  const input = resolveThemeAtmosphereInput(themeConfig, preset);
  const signature = resolveAtmosphereSignature(
    themeConfig._paletteId,
    preset,
    input.shadowTint,
    input.identityStrength,
  );
  const typography = resolveTypographySignature(themeConfig._paletteId, preset);
  const navVars = deriveSidebarNavCssVariables({
    paletteId: themeConfig._paletteId,
    signature,
    typography,
    mode: input.mode,
    scene,
  });

  if (!navVars) return;

  const root = document.documentElement;
  for (const [key, value] of Object.entries(navVars)) {
    root.style.setProperty(key, value);
  }
}
