import type {
  FoundationId,
  FoundationPaletteId,
  GenreId,
  IdentityId,
} from './appearancePresets';
import { clampChroma, resolveSaturationBudget, type SaturationBudget } from './saturationBudget';

/** Minimal profile shape — avoids circular import with themeProfile. */
export interface ThemeStackSource {
  foundation: FoundationId;
  foundationPalette: FoundationPaletteId;
  genre: GenreId;
  identity: IdentityId;
  applyBackgroundTint: boolean;
}

/**
 * Four-pass compositing stack:
 * foundation = values, genre = transforms, event = modulation, scene = orchestration.
 */
export interface ThemeStack {
  foundation: FoundationId;
  foundationPalette: FoundationPaletteId;
  genre: GenreId;
  eventOverlay: IdentityId;
  applyBackgroundTint: boolean;
}

export const DEFAULT_EVENT_OVERLAY_STRENGTH = 0.22;

export function resolveThemeStack(profile: ThemeStackSource): ThemeStack {
  return {
    foundation: profile.foundation,
    foundationPalette: profile.foundationPalette,
    genre: profile.genre,
    eventOverlay: profile.identity,
    applyBackgroundTint: profile.applyBackgroundTint,
  };
}

export function resolveEventOverlayStrength(
  profile: ThemeStackSource,
  budget?: SaturationBudget,
): number {
  const resolvedBudget = budget ?? resolveSaturationBudget(profile.identity);
  return clampChroma(
    'overlay',
    DEFAULT_EVENT_OVERLAY_STRENGTH,
    resolvedBudget,
  );
}
