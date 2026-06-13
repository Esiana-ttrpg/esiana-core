import { normalizeThemeProfile, type ThemeProfile } from './themeProfile';

/** Stable string for memo comparisons of theme profiles. */
export function themeProfileSignature(
  profile: Partial<ThemeProfile> | ThemeProfile | null | undefined,
): string {
  if (profile == null) return '';
  return JSON.stringify(normalizeThemeProfile(profile));
}
