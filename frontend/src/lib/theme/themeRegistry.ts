import {
  DEFAULT_THEME_PRESET,
  THEME_PRESET_IDS,
  type ThemeDefinition,
  type ThemePresetId,
} from './themeTypes';
import { THEME_CONFIGS, themeConfigToCssVariables } from './themeVariables';

function buildTheme(
  name: Exclude<ThemePresetId, 'auto'>,
  pluginId: string,
): ThemeDefinition {
  return {
    name,
    pluginId,
    variables: themeConfigToCssVariables({
      ...THEME_CONFIGS[name],
      _derivationPreset: name,
    }),
  };
}

const coreThemes: ThemeDefinition[] = [
  buildTheme('light', 'core.light'),
  buildTheme('dark', 'core.dark'),
  buildTheme('fantasy', 'core.fantasy'),
  buildTheme('cyberpunk', 'core.cyberpunk'),
  buildTheme('parchment', 'core.parchment'),
];

/** Plugin-ready registry of available themes. */
export const ThemeRegistry: ThemeDefinition[] = [...coreThemes];

export type {
  PluginTheme,
  CustomFieldDefinition,
  LayoutWidget,
} from '../pluginPresentation';

const registryByName = new Map<ThemePresetId, ThemeDefinition>(
  ThemeRegistry.map((theme) => [theme.name, theme]),
);

/** Preset id → registry entry (excludes `auto`, which is resolved at runtime). */
export const ThemePresets = Object.fromEntries(
  ThemeRegistry.map((theme) => [theme.name, theme]),
) as Record<Exclude<ThemePresetId, 'auto'>, ThemeDefinition>;

export function isThemePresetId(value: string): value is ThemePresetId {
  return (THEME_PRESET_IDS as readonly string[]).includes(value);
}

export function listThemes(): ThemeDefinition[] {
  return [...ThemeRegistry];
}

export function getThemeByName(name: ThemePresetId): ThemeDefinition | undefined {
  if (name === 'auto') return undefined;
  return registryByName.get(name);
}

export function registerTheme(theme: ThemeDefinition): void {
  const existing = registryByName.get(theme.name);
  if (existing) {
    const index = ThemeRegistry.indexOf(existing);
    ThemeRegistry[index] = theme;
  } else {
    ThemeRegistry.push(theme);
  }
  registryByName.set(theme.name, theme);
}

export function resolveThemePreset(preset: ThemePresetId): Exclude<ThemePresetId, 'auto'> {
  if (preset !== 'auto') return preset;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return DEFAULT_THEME_PRESET === 'auto' ? 'dark' : DEFAULT_THEME_PRESET;
}

/** CSS class applied on the campaign theme wrapper. */
export function campaignThemeClassName(preset: ThemePresetId): string {
  return `theme-${resolveThemePreset(preset)}`;
}

export const GLOBAL_THEME_STORAGE_KEY = 'esiana-global-theme-preset';
