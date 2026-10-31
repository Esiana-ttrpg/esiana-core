/** Supported persisted icon keys, shared by the API and category editors. */
export const EVENT_CATEGORY_ICONS = [
  { value: 'tag', label: 'Tag' },
  { value: 'swords', label: 'Swords' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'users', label: 'People' },
  { value: 'compass', label: 'Compass' },
  { value: 'triangle-alert', label: 'Alert' },
  { value: 'search', label: 'Search' },
  { value: 'heart', label: 'Heart' },
  { value: 'cake', label: 'Cake' },
  { value: 'crown', label: 'Crown' },
] as const;

export type EventCategoryIcon = (typeof EVENT_CATEGORY_ICONS)[number]['value'];
export function isEventCategoryIcon(value: unknown): value is EventCategoryIcon {
  return EVENT_CATEGORY_ICONS.some(icon => icon.value === value);
}

/** Distinguish legacy saved categories from the virtual null-category fallback. */
export function eventCategoryLabel(name: string): string {
  return name.trim().toLowerCase() === 'uncategorized' ? `${name} (saved category)` : name;
}

export function resolveEventCategoryFilter(value: string | null, categories: readonly { id: string }[]): string {
  if (!value) return 'all';
  return value === 'all' || value === 'uncategorized' || categories.some(category => category.id === value)
    ? value : 'all';
}

/** Starting points only: category identity is always the campaign's saved ID. */
export const DEFAULT_EVENT_CATEGORIES = [
  { name: 'Conflict', color: '#dc2626', icon: 'swords' },
  { name: 'Politics', color: '#7c3aed', icon: 'landmark' },
  { name: 'Society', color: '#0891b2', icon: 'users' },
  { name: 'Discovery', color: '#16a34a', icon: 'compass' },
  { name: 'Crisis', color: '#ea580c', icon: 'triangle-alert' },
  { name: 'Mystery', color: '#4f46e5', icon: 'search' },
  { name: 'Personal', color: '#db2777', icon: 'heart' },
  { name: 'Birthdays', color: '#ca8a04', icon: 'cake' },
  { name: 'Power', color: '#0d9488', icon: 'crown' },
] as const;
