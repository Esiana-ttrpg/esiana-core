import {
  CAMPAIGN_THEMES,
  isCatalogThemeSlug,
  normalizeThemeSlug,
} from './campaignThemes.js';

const MIN_CUSTOM_LENGTH = 3;
const MAX_THEME_LENGTH = 60;
const MAX_THEME_COUNT = 20;

function normalizeForLabelCollision(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const CATALOG_LABELS_NORMALIZED = new Set(
  CAMPAIGN_THEMES.map((entry) => normalizeForLabelCollision(entry.label)),
);

function isLabelCollision(value: string): boolean {
  return CATALOG_LABELS_NORMALIZED.has(normalizeForLabelCollision(value));
}

export function sanitizeGenreThemes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    const text = typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim();
    if (!text) continue;

    const normalized = normalizeThemeSlug(text);
    if (!normalized) continue;

    if (isCatalogThemeSlug(normalized)) {
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
      continue;
    }

    if (normalized.length < MIN_CUSTOM_LENGTH || normalized.length > MAX_THEME_LENGTH) {
      continue;
    }
    if (isLabelCollision(normalized)) {
      continue;
    }

    const customKey = normalized.toLowerCase();
    if (!seen.has(customKey)) {
      seen.add(customKey);
      result.push(normalized);
    }
  }

  return result.slice(0, MAX_THEME_COUNT);
}

/** Parse catalog slug filters from a recruitment directory query string. */
export function parseGenreThemeFilterQuery(raw: unknown): string[] {
  const parts: string[] = [];
  if (typeof raw === 'string') {
    parts.push(...raw.split(','));
  } else if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === 'string') parts.push(...entry.split(','));
    }
  }
  const slugs = parts
    .map((entry) => normalizeThemeSlug(entry.trim()))
    .filter((entry): entry is string => Boolean(entry && isCatalogThemeSlug(entry)));
  return Array.from(new Set(slugs));
}

export function campaignMatchesGenreThemeFilter(
  campaignThemes: string[],
  filterSlugs: string[],
): boolean {
  if (filterSlugs.length === 0) return true;
  const normalized = campaignThemes
    .map((theme) => normalizeThemeSlug(theme))
    .filter((theme): theme is string => Boolean(theme));
  return filterSlugs.some((slug) => normalized.includes(slug));
}
