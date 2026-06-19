/**
 * UI locale (BCP 47) — distinct from Campaign.language (table/recruitment language).
 */

/** Locales with shipped translation bundles. Community PRs extend this list. */
export const SHIPPED_UI_LOCALES = ['en', 'fr'] as const;

export type ShippedUiLocale = (typeof SHIPPED_UI_LOCALES)[number];

const BCP47_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export function sanitizeUiLocale(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!BCP47_PATTERN.test(trimmed)) return null;
  try {
    const [canonical] = Intl.getCanonicalLocales(trimmed);
    return canonical ?? null;
  } catch {
    return null;
  }
}

/** Primary language subtag for bundle loading (fr-CA → fr). */
export function uiLocaleLanguageTag(locale: string): string {
  return locale.split('-')[0]?.toLowerCase() || 'en';
}

export function resolveEffectiveUiLocale(input: {
  userUiLocale?: string | null;
  browserLanguage?: string | null;
  instanceDefaultLocale?: string | null;
  fallback?: string;
}): string {
  const user = sanitizeUiLocale(input.userUiLocale ?? null);
  if (user) return uiLocaleLanguageTag(user);

  const instance = resolveInstanceDefaultUiLocale(input.instanceDefaultLocale);
  if (instance) return instance;

  const browser = input.browserLanguage?.trim();
  if (browser) {
    const sanitized = sanitizeUiLocale(browser.split(',')[0]?.trim() ?? '');
    if (sanitized) return uiLocaleLanguageTag(sanitized);
  }

  const fallback = input.fallback ?? 'en';
  return uiLocaleLanguageTag(fallback);
}

/** Instance default from env/admin — only applies when the locale is shipped. */
export function resolveInstanceDefaultUiLocale(raw: unknown): string | null {
  const sanitized = sanitizeUiLocale(raw);
  if (!sanitized) return null;
  const tag = uiLocaleLanguageTag(sanitized);
  return isShippedUiLocale(tag) ? tag : null;
}

export function isShippedUiLocale(languageTag: string): boolean {
  return (SHIPPED_UI_LOCALES as readonly string[]).includes(languageTag);
}
