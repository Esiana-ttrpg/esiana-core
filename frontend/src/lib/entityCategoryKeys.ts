/**
 * Normalized entity category keys for metadata.entityCategory storage.
 * Display labels (title case) live in wiki folder titles / sidebar only.
 */

export const ENTITY_CATEGORY_DISPLAY_BY_KEY: Record<string, string> = {
  characters: 'Characters',
  bestiary: 'Bestiary',
  ancestries: 'Ancestries',
  organizations: 'Organizations',
  locations: 'Locations',
  languages: 'Languages',
  maps: 'Maps',
  objects: 'Objects',
  families: 'Families',
  'rules-resources': 'Rules/Resources',
  quests: 'Quests',
  journals: 'Journals',
  calendars: 'Calendars',
  timelines: 'Timelines',
  events: 'Events',
  bookmarks: 'Quick Access',
  relations: 'Relations',
  'recent-changes': 'Recent Changes',
};

const DISPLAY_TO_KEY = new Map<string, string>(
  Object.entries(ENTITY_CATEGORY_DISPLAY_BY_KEY).map(([key, label]) => [label, key]),
);

/** Slug-style normalization: trim → lowercase → collapse whitespace/slashes to hyphens. */
export function slugifyEntityCategoryRaw(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Folder title → storage key. "Bestiary" → "bestiary", "Rules/Resources" → "rules-resources". */
export function categoryTitleToEntityCategoryKey(title: string): string {
  const trimmed = title.trim();
  if (trimmed === 'Bookmarks') return 'bookmarks';
  const mapped = DISPLAY_TO_KEY.get(trimmed);
  if (mapped) return mapped;
  return slugifyEntityCategoryRaw(trimmed);
}

/** Normalize stored/read values to canonical key (handles legacy title-case stamps). */
export function normalizeEntityCategoryKey(
  raw: string | null | undefined,
): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const mapped = DISPLAY_TO_KEY.get(trimmed);
  if (mapped) return mapped;

  const slug = slugifyEntityCategoryRaw(trimmed);
  if (slug in ENTITY_CATEGORY_DISPLAY_BY_KEY) return slug;

  return slug || null;
}

/** Key → display label for UI. Unknown keys are title-cased from slug segments. */
export function entityCategoryKeyToDisplayLabel(key: string): string {
  const normalized = normalizeEntityCategoryKey(key);
  if (!normalized) return key;
  const label = ENTITY_CATEGORY_DISPLAY_BY_KEY[normalized];
  if (label) return label;
  return normalized
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

/** Values that should match metadata.entityCategory in index queries (canonical + legacy). */
export function entityCategoryIndexMatchValues(categoryTitle: string): string[] {
  const key = categoryTitleToEntityCategoryKey(categoryTitle);
  const values = new Set<string>([key, categoryTitle.trim()]);
  const display = ENTITY_CATEGORY_DISPLAY_BY_KEY[key];
  if (display) values.add(display);
  if (key === 'bookmarks') values.add('Bookmarks');
  return [...values];
}
