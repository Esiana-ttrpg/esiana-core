/** Keep in sync with `backend/src/lib/wikiSystemPages.ts`. */

export const RESERVED_SYSTEM_SLUGS = [
  'calendar',
  'timeline',
  'settings',
  'recent-changes',
  'recent_changes',
  'dashboard',
  'bookmarks',
  'world',
  'game',
  'gallery',
  'visual-atlas',
  'player-session-notes',
  'session-notes',
  'relations',
  'relationships',
  'tags',
  'tag',
] as const;

const DERIVED_RESERVED_SLUGS = [
  'calendars',
  'timelines',
  'events',
] as const;

export const SYSTEM_UTILITY_TEMPLATE_TYPES = ['SESSION_NOTE'] as const;

export const RESERVED_SYSTEM_SLUG_SET: ReadonlySet<string> = new Set([
  ...RESERVED_SYSTEM_SLUGS,
  ...DERIVED_RESERVED_SLUGS,
]);

/**
 * Lenient slug from a wiki page title: spaces and punctuation become single hyphens;
 * leading/trailing hyphens and trailing punctuation are stripped.
 */
export function wikiPageTitleToSlugLenient(title: string): string {
  const trimmed = title.trim().toLowerCase();
  if (!trimmed) return '';

  let slug = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  slug = slug.replace(/[^a-z0-9]+$/g, '').replace(/-+$/g, '');
  return slug;
}

export function wikiPageTitleToSlug(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '';

  const strict = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (strict.length >= 3 && strict.length <= 50) {
    return strict;
  }

  return wikiPageTitleToSlugLenient(trimmed);
}

const RESERVED_SLUG_PREFIXES = [
  'calendar',
  'timeline',
  'gallery',
  'visual-atlas',
  'tag',
  'relation',
] as const;

/** Structural sidebar folders — never valid parent targets or breadcrumb/picker labels. */
export function isStructuralDividerTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  if (normalized === 'world' || normalized === 'game') return true;
  const slug = wikiPageTitleToSlug(title);
  return slug === 'world' || slug === 'game';
}

export function matchesReservedSystemSlug(slug: string): boolean {
  if (!slug) return false;
  if (RESERVED_SYSTEM_SLUG_SET.has(slug)) return true;
  return RESERVED_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix));
}

export function isReservedSystemWikiPage(page: {
  title: string;
  templateType?: string | null;
}): boolean {
  const templateType = page.templateType?.trim();
  if (
    templateType &&
    (SYSTEM_UTILITY_TEMPLATE_TYPES as readonly string[]).includes(templateType)
  ) {
    return true;
  }

  const slug = wikiPageTitleToSlug(page.title);
  return matchesReservedSystemSlug(slug);
}
