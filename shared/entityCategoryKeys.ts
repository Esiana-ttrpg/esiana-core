/**
 * Normalized entity category keys for metadata.entityCategory storage.
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

export function slugifyEntityCategoryRaw(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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
