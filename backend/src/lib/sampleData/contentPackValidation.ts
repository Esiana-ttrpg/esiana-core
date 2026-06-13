import { isCatalogThemeSlug } from '../campaignThemes.js';
import { isValidGameSystemSlug } from '../gameSystems.js';
import { isCampaignFormatSlug } from '../../../../shared/campaignFormat.js';
import type { ContentPackManifestEntry } from '../pluginManifest.js';

const MAX_GENRE_THEMES = 3;
const MAX_AUTHOR_LEN = 80;

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeContentPackGenreThemes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const slug = typeof entry === 'string' ? entry.trim() : '';
    if (!slug || !isCatalogThemeSlug(slug) || seen.has(slug)) continue;
    seen.add(slug);
    result.push(slug);
    if (result.length >= MAX_GENRE_THEMES) break;
  }
  return result;
}

export function validateContentPackEntry(
  entry: ContentPackManifestEntry,
  index: number,
  errors: string[],
): void {
  if (!entry.id?.trim()) errors.push(`contentPacks[${index}].id is required`);
  if (!entry.name?.trim()) errors.push(`contentPacks[${index}].name is required`);
  if (!entry.description?.trim()) {
    errors.push(`contentPacks[${index}].description is required`);
  }
  if (!entry.packPath?.trim()) errors.push(`contentPacks[${index}].packPath is required`);
  if (!isCampaignFormatSlug(entry.campaignFormat)) {
    errors.push(`contentPacks[${index}].campaignFormat must be one-shot or campaign`);
  }
  if (entry.gameSystem && !isValidGameSystemSlug(entry.gameSystem)) {
    errors.push(`contentPacks[${index}].gameSystem is not a valid game system slug`);
  }
  if (entry.genreThemes?.length) {
    const sanitized = sanitizeContentPackGenreThemes(entry.genreThemes);
    if (sanitized.length !== entry.genreThemes.length) {
      errors.push(`contentPacks[${index}].genreThemes must be catalog slugs only (max ${MAX_GENRE_THEMES})`);
    }
  }
  if (entry.author && entry.author.length > MAX_AUTHOR_LEN) {
    errors.push(`contentPacks[${index}].author must be at most ${MAX_AUTHOR_LEN} characters`);
  }
  if (entry.authorUrl && !isHttpsUrl(entry.authorUrl)) {
    errors.push(`contentPacks[${index}].authorUrl must be a valid https URL`);
  }
}
