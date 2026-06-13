import { isAppearanceProfileDefined } from './parseAppearanceProfile';
import {
  legacyBrandingToThemeProfile,
  normalizeThemeProfile,
  type ThemeProfile,
} from './themeProfile';

export { isAppearanceProfileDefined } from './parseAppearanceProfile';

export interface ThemeResolutionInputs {
  userPref?: Partial<ThemeProfile> | null;
  campaignPref?: Partial<ThemeProfile> | null;
  systemDefault: ThemeProfile;
  /** When false, campaign layer is skipped if user has no custom profile. Default true. */
  allowCampaignSystemOverride?: boolean;
}

function mergeWithSystem(
  systemDefault: ThemeProfile,
  partial: Partial<ThemeProfile> | null | undefined,
): ThemeProfile {
  if (!isAppearanceProfileDefined(partial)) {
    return normalizeThemeProfile(systemDefault);
  }
  return normalizeThemeProfile({ ...systemDefault, ...partial });
}

/**
 * Cascading theme resolution: user → campaign → system.
 * User profile always wins when defined; otherwise campaign (if allowed) then system.
 */
export function resolveThemeProfile(inputs: ThemeResolutionInputs): ThemeProfile {
  const {
    userPref,
    campaignPref,
    systemDefault,
    allowCampaignSystemOverride = true,
  } = inputs;

  if (isAppearanceProfileDefined(userPref)) {
    return mergeWithSystem(systemDefault, userPref);
  }

  if (allowCampaignSystemOverride && isAppearanceProfileDefined(campaignPref)) {
    return mergeWithSystem(systemDefault, campaignPref);
  }

  return normalizeThemeProfile(systemDefault);
}

/** Build campaign profile partial from legacy themePreset when appearanceProfile is absent. */
export function campaignLegacyPresetToPartial(
  themePreset: string | null | undefined,
): Partial<ThemeProfile> | null {
  const raw = (themePreset ?? '').trim();
  if (!raw) return null;
  return legacyBrandingToThemeProfile({ globalThemePreset: raw });
}
