import { sanitizeGlobalPalette } from './globalPalette.js';
import { sanitizeThemePreset, type ThemePreset } from './themePresets.js';

const FOUNDATION_IDS = ['light', 'dark'] as const;
const GENRE_IDS = ['none', 'fantasy', 'cyberpunk', 'parchment'] as const;
const IDENTITY_IDS = ['none', 'trans', 'pride', 'halloween', 'christmas'] as const;

const FOUNDATION_PALETTE_IDS = [
  'ocean',
  'midnight',
  'forest',
  'ember',
  'deep_space',
  'sunset',
  'desert',
  'arctic',
] as const;

export interface AppearanceProfile {
  foundation: 'light' | 'dark';
  genre: 'none' | 'fantasy' | 'cyberpunk' | 'parchment';
  identity: 'none' | 'trans' | 'pride' | 'halloween' | 'christmas';
  foundationPalette: string;
  applyBackgroundTint: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase() as T;
  return (allowed as readonly string[]).includes(normalized) ? normalized : fallback;
}

export function normalizeAppearanceProfile(
  partial: Record<string, unknown>,
): AppearanceProfile {
  let foundation = pickEnum(partial.foundation, FOUNDATION_IDS, 'dark');
  const genre = pickEnum(partial.genre, GENRE_IDS, 'none');
  let identity = pickEnum(partial.identity, IDENTITY_IDS, 'none');

  if (genre === 'fantasy' || genre === 'cyberpunk') {
    foundation = 'dark';
  } else if (genre === 'parchment') {
    foundation = 'light';
  }

  const paletteRaw =
    typeof partial.foundationPalette === 'string'
      ? partial.foundationPalette.trim().toLowerCase()
      : 'ocean';

  let foundationPalette = (FOUNDATION_PALETTE_IDS as readonly string[]).includes(
    paletteRaw,
  )
    ? paletteRaw
    : (sanitizeGlobalPalette(paletteRaw) ?? 'ocean');

  if (identity !== 'none') {
    const holidayMode =
      identity === 'trans' || identity === 'pride' ? 'light' : 'dark';
    const genreMode =
      genre === 'fantasy' || genre === 'cyberpunk'
        ? 'dark'
        : genre === 'parchment'
          ? 'light'
          : null;
    if (genreMode !== null && holidayMode !== genreMode) {
      identity = 'none';
    } else if (genre === 'none' && holidayMode !== foundation) {
      foundation = holidayMode;
      if (!(FOUNDATION_PALETTE_IDS as readonly string[]).includes(foundationPalette)) {
        foundationPalette =
          foundation === 'light' ? 'arctic' : 'ocean';
      }
    }
  }

  if (
    !(FOUNDATION_PALETTE_IDS as readonly string[]).includes(foundationPalette)
  ) {
    foundationPalette = foundation === 'light' ? 'arctic' : 'ocean';
  }

  return {
    foundation,
    genre,
    identity,
    foundationPalette,
    applyBackgroundTint: Boolean(partial.applyBackgroundTint),
  };
}

/**
 * Sanitize stored appearance JSON.
 * - `undefined` = field omitted
 * - `null` = clear profile
 * - object = normalized profile
 */
export function sanitizeAppearanceProfile(
  value: unknown,
): AppearanceProfile | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!isPlainObject(value)) return undefined;
  return normalizeAppearanceProfile(value);
}

export function appearanceProfileToThemePreset(profile: AppearanceProfile): ThemePreset {
  if (profile.genre === 'fantasy' || profile.genre === 'cyberpunk' || profile.genre === 'parchment') {
    return profile.genre;
  }
  return profile.foundation === 'light' ? 'light' : 'dark';
}

export function legacyPresetToAppearancePartial(
  themePreset: string | null | undefined,
): AppearanceProfile | null {
  const preset = sanitizeThemePreset(themePreset ?? 'dark');
  if (!preset) return null;
  if (preset === 'fantasy' || preset === 'cyberpunk' || preset === 'parchment') {
    return normalizeAppearanceProfile({ genre: preset, foundation: preset === 'parchment' ? 'light' : 'dark' });
  }
  if (preset === 'light') {
    return normalizeAppearanceProfile({ foundation: 'light' });
  }
  return normalizeAppearanceProfile({ foundation: 'dark' });
}

export function resolveCampaignAppearanceProfile(campaign: {
  appearanceProfile: unknown;
  themePreset: string | null;
}): AppearanceProfile | null {
  const stored = sanitizeAppearanceProfile(campaign.appearanceProfile);
  if (stored) return stored;
  return legacyPresetToAppearancePartial(campaign.themePreset);
}

export function serializeAppearanceProfileForApi(
  profile: AppearanceProfile | null,
): AppearanceProfile | null {
  return profile
    ? normalizeAppearanceProfile(profile as unknown as Record<string, unknown>)
    : null;
}
