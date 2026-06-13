import type { GenreId, IdentityId } from './appearancePresets';
import type { ThemeAtmosphereSignature } from './atmosphereSignature';
import type { ThemeTypographySignature } from './typographySignature';
import type { ThemeConfig } from './themeTypes';
import { applyGenreTransforms } from './genreIdentity';
import { modulateEventOverlay } from './eventOverlay';
import { resolveSaturationBudget } from './saturationBudget';
import { DEFAULT_EVENT_OVERLAY_STRENGTH } from './themeStack';
import type { LuminanceEcology } from './luminanceEcology';

export interface ThemeStackDerivationInput {
  atmosphereSignature: ThemeAtmosphereSignature;
  typographySignature: ThemeTypographySignature;
  cssVars: Record<string, string>;
  config: ThemeConfig;
}

export interface ThemeStackDerivationResult {
  atmosphereSignature: ThemeAtmosphereSignature;
  typographySignature: ThemeTypographySignature;
  cssVars: Record<string, string>;
  ecology: LuminanceEcology;
}

export function applyThemeStackDerivation(
  input: ThemeStackDerivationInput,
  mode: 'light' | 'dark',
): ThemeStackDerivationResult {
  const genre = configGenre(input.config);
  const eventOverlay = configEventOverlay(input.config);
  const overlayStrength =
    input.config._eventOverlayStrength ?? DEFAULT_EVENT_OVERLAY_STRENGTH;
  const budget = resolveSaturationBudget(eventOverlay);

  const genrePass = applyGenreTransforms(
    input.atmosphereSignature,
    input.typographySignature,
    mode,
    input.config._paletteId,
    genre,
  );

  const eventPass = modulateEventOverlay(
    genrePass.atmosphereSignature,
    input.cssVars,
    eventOverlay,
    overlayStrength,
    budget,
  );

  return {
    atmosphereSignature: eventPass.signature,
    typographySignature: genrePass.typographySignature,
    cssVars: eventPass.cssVars,
    ecology: genrePass.ecology,
  };
}

function configGenre(config: ThemeConfig): GenreId | undefined {
  return config._genre;
}

function configEventOverlay(config: ThemeConfig): IdentityId | undefined {
  return config._eventOverlay;
}
