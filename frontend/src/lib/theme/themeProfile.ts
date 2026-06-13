import type { ThemePresetId } from './themeTypes';
import { campaignThemeClassName, resolveThemePreset } from './themeRegistry';
import {
  APPEARANCE_PRESETS,
  DEFAULT_DARK_PALETTE,
  getDefaultFoundationPalette,
  getFoundationPalettesForMode,
  getPaletteColorMode,
  GLOBAL_PALETTES,
  isFoundationPaletteId,
  isGlobalPaletteId,
  isHolidayPaletteId,
  type FoundationId,
  type FoundationPaletteId,
  isGenreId,
  type GenreId,
  type GlobalPaletteId,
  type IdentityId,
  type PaletteColorMode,
} from './appearancePresets';
import {
  applyPaletteToTheme,
  type ApplyPaletteOptions,
} from './globalPalette';
import { THEME_CONFIGS } from './themeVariables';
import type { ThemeConfig } from './themeTypes';
import {
  resolveEventOverlayStrength,
  resolveThemeStack,
} from './themeStack';
import {
  isAppearanceProfileDefined,
  serializeAppearanceProfile,
} from './parseAppearanceProfile';

export interface ThemeProfile {
  foundation: FoundationId;
  genre: GenreId;
  identity: IdentityId;
  /** Accent palette when no identity/holiday theme is active. */
  foundationPalette: FoundationPaletteId;
  applyBackgroundTint: boolean;
}

export const DEFAULT_THEME_PROFILE: ThemeProfile = {
  foundation: 'dark',
  genre: 'none',
  identity: 'none',
  foundationPalette: DEFAULT_DARK_PALETTE,
  applyBackgroundTint: false,
};

export const THEME_PROFILE_STORAGE_KEY = 'esiana-theme-profile';

/** Classes toggled on `<html>` when applying a theme profile or preset. */
export const GLOBAL_THEME_HTML_CLASSES = [
  'theme-light',
  'theme-dark',
  'theme-fantasy',
  'theme-cyberpunk',
  'theme-parchment',
] as const;

export function getThemeClassNameFromProfile(profile: ThemeProfile): string {
  return campaignThemeClassName(resolveThemePresetFromProfile(normalizeThemeProfile(profile)));
}

/** Sync `<html>` class from a profile (e.g. `theme-parchment` when genre is parchment). */
export function syncHtmlThemeClassFromProfile(profile: ThemeProfile): void {
  const root = document.documentElement;
  root.classList.remove(...GLOBAL_THEME_HTML_CLASSES);
  root.classList.add(getThemeClassNameFromProfile(profile));
}

export function syncHtmlThemeClassFromPreset(preset: ThemePresetId): void {
  const root = document.documentElement;
  root.classList.remove(...GLOBAL_THEME_HTML_CLASSES);
  root.classList.add(campaignThemeClassName(preset));
}

export function resolveThemePresetFromProfile(profile: ThemeProfile): ThemePresetId {
  if (profile.genre !== 'none') {
    return APPEARANCE_PRESETS.genre[profile.genre].preset;
  }
  return profile.foundation;
}

/** Foundation palette always owns structural canvas — identity is event overlay only. */
export function resolvePaletteFromProfile(profile: ThemeProfile): GlobalPaletteId {
  return normalizeThemeProfile(profile).foundationPalette;
}

export function resolveProfileColorMode(profile: ThemeProfile): PaletteColorMode {
  if (profile.genre !== 'none') {
    return APPEARANCE_PRESETS.genre[profile.genre].mode;
  }
  return APPEARANCE_PRESETS.foundation[profile.foundation].mode;
}

export function normalizeThemeProfile(
  partial: Partial<ThemeProfile> | null | undefined,
): ThemeProfile {
  const base = { ...DEFAULT_THEME_PROFILE, ...partial };
  let foundation: FoundationId =
    base.foundation === 'light' ? 'light' : 'dark';
  let genre: GenreId = isGenreId(base.genre) ? base.genre : 'none';
  let identity: IdentityId = 'none';
  if (
    base.identity === 'trans' ||
    base.identity === 'pride' ||
    base.identity === 'halloween' ||
    base.identity === 'christmas'
  ) {
    identity = base.identity;
  }

  const allowedFoundation = getFoundationPalettesForMode(foundation);
  let foundationPalette: FoundationPaletteId = getDefaultFoundationPalette(foundation);
  if (
    isFoundationPaletteId(base.foundationPalette) &&
    (allowedFoundation as readonly string[]).includes(base.foundationPalette)
  ) {
    foundationPalette = base.foundationPalette;
  }

  if (genre !== 'none') {
    const genreMode = APPEARANCE_PRESETS.genre[genre].mode;
    foundation = genreMode === 'light' ? 'light' : 'dark';
    const allowedGenreFoundation = getFoundationPalettesForMode(foundation);
    if (
      !isFoundationPaletteId(foundationPalette) ||
      !(allowedGenreFoundation as readonly string[]).includes(foundationPalette)
    ) {
      foundationPalette = getDefaultFoundationPalette(foundation);
    }
  }

  if (identity !== 'none') {
    const holidayMode = APPEARANCE_PRESETS.holiday[identity].mode;
    const genreMode =
      genre !== 'none' ? APPEARANCE_PRESETS.genre[genre].mode : null;
    if (genreMode !== null && holidayMode !== genreMode) {
      identity = 'none';
    } else if (genre === 'none' && holidayMode !== foundation) {
      foundation = holidayMode;
      const palettes = getFoundationPalettesForMode(foundation);
      if (!(palettes as readonly string[]).includes(foundationPalette)) {
        foundationPalette = getDefaultFoundationPalette(foundation);
      }
    }
  }

  return {
    foundation,
    genre,
    identity,
    foundationPalette,
    applyBackgroundTint: Boolean(base.applyBackgroundTint),
  };
}

/** Maps profile to persisted SystemSetting branding fields. */
export function themeProfileToLegacyBranding(profile: ThemeProfile): {
  globalThemePreset: ThemePresetId;
  globalPalette: GlobalPaletteId;
  applyBackgroundTint: boolean;
  appearanceProfile: ThemeProfile;
} {
  const normalized = normalizeThemeProfile(profile);
  return {
    globalThemePreset: resolveThemePresetFromProfile(normalized),
    globalPalette: resolvePaletteFromProfile(normalized),
    applyBackgroundTint: normalized.applyBackgroundTint,
    appearanceProfile: serializeAppearanceProfile(normalized),
  };
}

/** Prefer stored appearanceProfile; fall back to legacy preset/palette fields. */
export function brandingToThemeProfile(input: {
  appearanceProfile?: Partial<ThemeProfile> | null;
  globalThemePreset?: string | null;
  globalPalette?: string | null;
  applyBackgroundTint?: boolean | null;
}): ThemeProfile {
  if (isAppearanceProfileDefined(input.appearanceProfile)) {
    return normalizeThemeProfile(input.appearanceProfile);
  }
  return legacyBrandingToThemeProfile(input);
}

export function legacyBrandingToThemeProfile(input: {
  globalThemePreset?: string | null;
  globalPalette?: string | null;
  applyBackgroundTint?: boolean | null;
}): ThemeProfile {
  const presetRaw = (input.globalThemePreset ?? 'dark').trim().toLowerCase();
  const paletteRaw = (input.globalPalette ?? DEFAULT_DARK_PALETTE).trim().toLowerCase();

  let genre: GenreId = 'none';
  let foundation: FoundationId = 'dark';

  if (isGenreId(presetRaw)) {
    genre = presetRaw;
    foundation =
      APPEARANCE_PRESETS.genre[presetRaw].mode === 'light' ? 'light' : 'dark';
  } else if (presetRaw === 'light') {
    foundation = 'light';
  } else if (presetRaw === 'auto') {
    foundation =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  }

  let identity: IdentityId = 'none';
  let foundationPalette: FoundationPaletteId = getDefaultFoundationPalette(foundation);

  if (isHolidayPaletteId(paletteRaw)) {
    identity = paletteRaw;
  } else if (isFoundationPaletteId(paletteRaw)) {
    foundationPalette = paletteRaw;
  } else if (isGlobalPaletteId(paletteRaw)) {
    foundationPalette = getDefaultFoundationPalette(foundation);
  }

  return normalizeThemeProfile({
    foundation,
    genre,
    identity,
    foundationPalette,
    applyBackgroundTint: Boolean(input.applyBackgroundTint),
  });
}

export function isProfilePaletteCompatible(profile: ThemeProfile): boolean {
  const normalized = normalizeThemeProfile(profile);
  const mode = resolveProfileColorMode(normalized);
  return getPaletteColorMode(normalized.foundationPalette) === mode;
}

export function resolveProfilePaletteWithFallback(
  profile: ThemeProfile,
): GlobalPaletteId {
  const normalized = normalizeThemeProfile(profile);
  const mode = resolveProfileColorMode(normalized);
  if (getPaletteColorMode(normalized.foundationPalette) === mode) {
    return normalized.foundationPalette;
  }
  return getDefaultFoundationPalette(normalized.foundation);
}

export function resolveAccentPaletteId(profile: ThemeProfile): GlobalPaletteId {
  const normalized = normalizeThemeProfile(profile);
  if (normalized.identity !== 'none') {
    return APPEARANCE_PRESETS.holiday[normalized.identity].palette;
  }
  return normalized.foundationPalette;
}

export function buildMergedThemeConfigFromProfile(profile: ThemeProfile): ThemeConfig {
  const normalized = normalizeThemeProfile(profile);
  const preset = resolveThemePresetFromProfile(normalized);
  const resolvedPreset = resolveThemePreset(preset);
  const foundationPalette = resolveProfilePaletteWithFallback(normalized);
  const accentPaletteId = resolveAccentPaletteId(normalized);
  const stack = resolveThemeStack(normalized);
  const baseTheme = THEME_CONFIGS[resolvedPreset];
  const accentPalette = GLOBAL_PALETTES[accentPaletteId];

  const merged = applyPaletteToTheme(baseTheme, accentPaletteId, {
    applyBackgroundTint: normalized.applyBackgroundTint,
  });

  return {
    ...merged,
    primary: accentPalette.primary,
    primaryHover: accentPalette.primaryHover,
    accent: accentPalette.accent,
    _derivationPreset: resolvedPreset,
    _paletteId: foundationPalette,
    _genre: stack.genre !== 'none' ? stack.genre : undefined,
    _eventOverlay:
      stack.eventOverlay !== 'none' ? stack.eventOverlay : undefined,
    _eventOverlayStrength: resolveEventOverlayStrength(normalized),
    _identityStrength: normalized.applyBackgroundTint ? 1.5 : 1,
  };
}

export function buildThemeConfigFromProfile(profile: ThemeProfile) {
  const normalized = normalizeThemeProfile(profile);
  const preset = resolveThemePresetFromProfile(normalized);
  const resolvedPreset = resolveThemePreset(preset);
  const palette = resolveProfilePaletteWithFallback(normalized);
  const merged = buildMergedThemeConfigFromProfile(normalized);
  return {
    preset,
    resolvedPreset,
    palette,
    merged,
    profile: normalized,
  };
}

export function getProfilePreviewPalette(profile: ThemeProfile) {
  const accentPaletteId = resolveAccentPaletteId(normalizeThemeProfile(profile));
  return GLOBAL_PALETTES[accentPaletteId];
}

export function cacheThemeProfile(profile: ThemeProfile): void {
  try {
    localStorage.setItem(
      THEME_PROFILE_STORAGE_KEY,
      JSON.stringify(normalizeThemeProfile(profile)),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readCachedThemeProfile(): ThemeProfile | null {
  try {
    const raw = localStorage.getItem(THEME_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeThemeProfile(JSON.parse(raw) as Partial<ThemeProfile>);
  } catch {
    return null;
  }
}
