import { normalizeThemeProfile, type ThemeProfile } from './themeProfile';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when a stored appearance profile object is present (non-null). */
export function isAppearanceProfileDefined(
  pref: unknown,
): pref is Partial<ThemeProfile> {
  return pref != null && isPlainObject(pref);
}

/** Parse JSON/API value into a partial profile, or null when absent. */
export function parseAppearanceProfileJson(
  value: unknown,
): Partial<ThemeProfile> | null {
  if (value == null) return null;
  if (!isPlainObject(value)) return null;
  return value as Partial<ThemeProfile>;
}

/** Parse and normalize against system default into a complete profile. */
export function parseAppearanceProfile(
  value: unknown,
  systemDefault: ThemeProfile,
): ThemeProfile | null {
  const partial = parseAppearanceProfileJson(value);
  if (!isAppearanceProfileDefined(partial)) return null;
  return normalizeThemeProfile({ ...systemDefault, ...partial });
}

/** Serialize a profile for API storage (normalized snapshot). */
export function serializeAppearanceProfile(profile: ThemeProfile): ThemeProfile {
  return normalizeThemeProfile(profile);
}
