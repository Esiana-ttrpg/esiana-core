import type { CategoryIndexChild } from '@/lib/wiki';

/** Sort a copy of visible locations; callers retain the original hierarchy and data. */
export function sortLocationBrowseChildren(
  children: readonly CategoryIndexChild[], sort: string, direction: 'asc' | 'desc',
): CategoryIndexChild[] {
  return [...children].sort((a, b) => {
    const compare = sort === 'updated' ? a.updatedAt.localeCompare(b.updatedAt)
      : a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    return (direction === 'desc' ? -compare : compare) || a.id.localeCompare(b.id);
  });
}

export interface LocationBrowseGroup {
  key: string;
  label: string;
  children: CategoryIndexChild[];
}

export function groupLocationBrowseChildren(
  children: readonly CategoryIndexChild[],
  regionFor: (child: CategoryIndexChild) => { regionPageId: string | null; region: string | null; label: string | null },
): LocationBrowseGroup[] {
  const groups = new Map<string, LocationBrowseGroup>();
  for (const child of children) {
    const { regionPageId, region, label } = regionFor(child);
    const text = region?.trim().normalize('NFKC') ?? '';
    const pageId = regionPageId?.trim();
    const key = pageId ? JSON.stringify(['page', pageId])
      : text ? JSON.stringify(['text', text.toLowerCase()]) : JSON.stringify(['unset']);
    const group = groups.get(key) ?? { key, label: label?.trim() || text || (pageId ? 'Unknown region' : 'No region'), children: [] };
    group.children.push(child);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key));
}
