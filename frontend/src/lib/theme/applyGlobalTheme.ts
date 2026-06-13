import { getThemeByName, resolveThemePreset } from './themeRegistry';
import { themeConfigToCssVariables, THEME_CONFIGS } from './themeVariables';
import type { ThemeConfig, ThemePresetId } from './themeTypes';
import {
  applyPaletteToTheme,
  DEFAULT_GLOBAL_PALETTE,
  GLOBAL_BACKGROUND_TINT_STORAGE_KEY,
  GLOBAL_PALETTE_STORAGE_KEY,
  GLOBAL_PALETTE_TINTS_STORAGE_KEY,
  resolvePaletteColorMode,
  resolvePaletteForPreset,
  type GlobalPaletteId,
} from './globalPalette';
import { applySceneComposition } from './applySceneComposition';
import {
  buildMergedThemeConfigFromProfile,
  isProfilePaletteCompatible,
  normalizeThemeProfile,
  resolveThemePresetFromProfile,
  syncHtmlThemeClassFromPreset,
  syncHtmlThemeClassFromProfile,
  type ThemeProfile,
} from './themeProfile';
import type { SceneCompositionProfile } from './sceneComposition';
import {
  resolveSidebarAtmosphereRecipe,
  resolveSidebarEcologyValue,
} from './sidebarAtmosphereRecipes';

function resolveColorScheme(resolved: ReturnType<typeof resolveThemePreset>): 'light' | 'dark' {
  return resolved === 'light' || resolved === 'parchment' ? 'light' : 'dark';
}

function syncGlobalThemeClass(preset: ThemePresetId): void {
  syncHtmlThemeClassFromPreset(preset);
}

export interface ApplyGlobalThemeOptions {
  scene?: SceneCompositionProfile | null;
}

export function applyGlobalTheme(
  themeConfig: ThemeConfig,
  colorScheme: 'light' | 'dark' = 'dark',
  options?: ApplyGlobalThemeOptions,
): void {
  const variables = themeConfigToCssVariables(themeConfig, {
    scene: options?.scene,
  });
  const root = document.documentElement;
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
  root.style.colorScheme = colorScheme;
  syncAtmosphereDataAttributes(variables, themeConfig);
  applySceneComposition(options?.scene ?? null, themeConfig);
}

function syncAtmosphereDataAttributes(
  variables: Record<string, string>,
  themeConfig: ThemeConfig,
): void {
  const root = document.documentElement;
  const paletteId = themeConfig._paletteId;
  root.dataset.atmosphereGradientBehavior =
    variables['--atmosphere-gradient-behavior'] ?? 'void_vignette';
  root.dataset.atmosphereBloomBehavior =
    variables['--atmosphere-bloom-behavior'] ?? 'desaturated_dust';
  root.dataset.atmosphereWarmCorner = variables['--atmosphere-warm-corner'] ?? 'none';
  root.dataset.atmosphereColdCorner = variables['--atmosphere-cold-corner'] ?? 'none';

  if (themeConfig._genre) {
    root.dataset.genre = themeConfig._genre;
  } else {
    delete root.dataset.genre;
  }

  if (themeConfig._eventOverlay) {
    root.dataset.eventOverlay = themeConfig._eventOverlay;
  } else {
    delete root.dataset.eventOverlay;
  }

  const sidebarEcology =
    themeConfig._genre === 'parchment'
      ? 'sunlit'
      : resolveSidebarEcologyValue(paletteId);
  const sidebarRecipe = resolveSidebarAtmosphereRecipe(paletteId);
  if (sidebarEcology && sidebarRecipe) {
    root.dataset.sidebarEcology = sidebarEcology;
    root.dataset.sidebarAtmosphere = sidebarRecipe;
  } else {
    delete root.dataset.sidebarEcology;
    delete root.dataset.sidebarAtmosphere;
  }
}

/** Apply a preset (including `auto`) to `:root` CSS variables. */
export function applyGlobalThemePreset(preset: ThemePresetId): void {
  const resolved = resolveThemePreset(preset);
  const theme = getThemeByName(resolved);
  if (!theme) return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.variables)) {
    root.style.setProperty(key, value);
  }
  root.style.colorScheme = resolveColorScheme(resolved);
  syncGlobalThemeClass(preset);
}

/** Apply a full appearance profile (foundation + genre + identity). */
export function applyThemeProfile(profile: ThemeProfile): void {
  const normalized = normalizeThemeProfile(profile);
  const preset = resolveThemePresetFromProfile(normalized);
  const resolved = resolveThemePreset(preset);

  if (!isProfilePaletteCompatible(normalized)) {
    console.warn(
      `[esiana/theme] Theme profile palette mismatch (foundation=${normalized.foundation}, ` +
        `genre=${normalized.genre}, identity=${normalized.identity}).`,
    );
  }

  const themeConfig = buildMergedThemeConfigFromProfile(normalized);
  applyGlobalTheme(themeConfig, resolveColorScheme(resolved));
  syncHtmlThemeClassFromProfile(normalized);
}

export function applyGlobalThemePresetWithPalette(
  preset: ThemePresetId,
  palette: GlobalPaletteId = DEFAULT_GLOBAL_PALETTE,
  applyBackgroundTint = false,
): void {
  const resolved = resolveThemePreset(preset);
  const mode = resolvePaletteColorMode(preset);
  const effectivePalette = resolvePaletteForPreset(palette, preset);

  if (effectivePalette !== palette) {
    console.warn(
      `[esiana/theme] Palette "${palette}" is not compatible with ${mode} mode ` +
        `(preset: "${preset}"). Falling back to "${effectivePalette}".`,
    );
  }

  const baseTheme = THEME_CONFIGS[resolved];
  const mergedTheme: ThemeConfig = {
    ...applyPaletteToTheme(baseTheme, effectivePalette, {
      applyBackgroundTint,
    }),
    _derivationPreset: resolved,
    _paletteId: effectivePalette,
    _identityStrength: applyBackgroundTint ? 1.5 : 1,
  };

  applyGlobalTheme(mergedTheme, resolveColorScheme(resolved));
  syncGlobalThemeClass(preset);
}

export function cacheGlobalThemePreset(preset: ThemePresetId): void {
  try {
    localStorage.setItem('esiana-global-theme-preset', preset);
  } catch {
    // ignore quota / private mode
  }
}

export function cacheGlobalPalette(palette: GlobalPaletteId): void {
  try {
    localStorage.setItem(GLOBAL_PALETTE_STORAGE_KEY, palette);
  } catch {
    // ignore quota / private mode
  }
}

export function cacheGlobalBackgroundTint(applyBackgroundTint: boolean): void {
  try {
    const value = applyBackgroundTint ? '1' : '0';
    localStorage.setItem(GLOBAL_BACKGROUND_TINT_STORAGE_KEY, value);
    localStorage.setItem(GLOBAL_PALETTE_TINTS_STORAGE_KEY, value);
  } catch {
    // ignore quota / private mode
  }
}

/** @deprecated Use {@link cacheGlobalBackgroundTint} */
export const cacheGlobalPaletteApplyTints = cacheGlobalBackgroundTint;

export function readCachedGlobalBackgroundTint(): boolean {
  try {
    const current = localStorage.getItem(GLOBAL_BACKGROUND_TINT_STORAGE_KEY);
    if (current !== null) return current === '1';
    return localStorage.getItem(GLOBAL_PALETTE_TINTS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** @deprecated Use {@link readCachedGlobalBackgroundTint} */
export const readCachedGlobalPaletteApplyTints = readCachedGlobalBackgroundTint;
