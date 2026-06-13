import {
  deriveSurfaceRoleCssVariables,
  extractCanvasHueBias,
  type CanvasHueBias,
} from './atmosphericDerivation';
import type { SceneCompositionProfile } from './sceneComposition';
import type { ThemeConfig, ThemePresetId } from './themeTypes';

function resolveDerivationPreset(
  config: ThemeConfig,
): Exclude<ThemePresetId, 'auto'> {
  return config._derivationPreset ?? 'dark';
}

function resolveCanvasBias(config: ThemeConfig): Partial<CanvasHueBias> | undefined {
  if (
    config.canvasHueBias === undefined &&
    config.warmthBias === undefined &&
    config.saturationBias === undefined
  ) {
    return undefined;
  }
  return {
    canvasHue: config.canvasHueBias,
    warmth: config.warmthBias,
    saturation: config.saturationBias,
  };
}

export interface ThemeDerivationOptions {
  scene?: SceneCompositionProfile | null;
}

/** Derive dual-theme surface role tokens from base theme colors. */
export function deriveSurfaceRoleTokens(
  config: ThemeConfig,
  preset?: Exclude<ThemePresetId, 'auto'>,
  options?: ThemeDerivationOptions,
): Record<string, string> {
  const resolvedPreset = preset ?? resolveDerivationPreset(config);
  return deriveSurfaceRoleCssVariables(config, resolvedPreset, {
    bias: resolveCanvasBias(config),
    scene: options?.scene,
  });
}

/** Maps semantic theme config to CSS custom property names. */
export function themeConfigToCssVariables(
  config: ThemeConfig,
  options?: ThemeDerivationOptions,
): Record<string, string> {
  const preset = resolveDerivationPreset(config);
  const roleTokens = deriveSurfaceRoleCssVariables(config, preset, {
    bias: resolveCanvasBias(config),
    scene: options?.scene,
  });

  return {
    '--color-primary': config.primary,
    '--color-primary-hover': config.primaryHover,
    '--color-text': config.text,
    '--color-text-muted': config.textMuted,
    '--color-accent': config.accent,
    '--accent-gold': '#c8a96b',
    '--accent-warm': '#9f7a45',
    '--accent-soft': '#e0c48f',
    ...roleTokens,
  };
}

export const THEME_CONFIGS: Record<
  Exclude<ThemePresetId, 'auto'>,
  ThemeConfig
> = {
  light: {
    primary: '#d97706',
    primaryHover: '#b45309',
    bg: '#f8fafc',
    bgElevated: '#f1f5f9',
    surface: '#ffffff',
    border: '#cbd5e1',
    text: '#0f172a',
    textMuted: '#64748b',
    accent: '#4f46e5',
  },
  dark: {
    primary: '#f59e0b',
    primaryHover: '#d97706',
    bg: '#090b11',
    bgElevated: '#0d1118',
    surface: '#111827',
    border: 'rgb(214 197 168 / 0.10)',
    text: '#e8e4dc',
    textMuted: '#8a8278',
    accent: '#c4a574',
  },
  fantasy: {
    primary: '#a78bfa',
    primaryHover: '#8b5cf6',
    bg: '#1a1028',
    bgElevated: '#261636',
    surface: '#32204a',
    border: 'rgb(214 197 168 / 0.12)',
    text: '#f3e8ff',
    textMuted: '#b8a8d4',
    accent: '#fbbf24',
  },
  cyberpunk: {
    primary: '#22d3ee',
    primaryHover: '#06b6d4',
    bg: '#050510',
    bgElevated: '#0a0a1a',
    surface: '#12122a',
    border: 'rgb(214 197 168 / 0.10)',
    text: '#e0f2fe',
    textMuted: '#8a9aaa',
    accent: '#f472b6',
  },
  parchment: {
    primary: '#7c5c2e',
    primaryHover: '#5c4522',
    bg: '#f8f0e0',
    bgElevated: '#f3e8d4',
    surface: '#fffef8',
    border: '#d4c4a8',
    text: '#2c2416',
    textMuted: '#5c4f3a',
    accent: '#8b6914',
  },
};

export { extractCanvasHueBias };
