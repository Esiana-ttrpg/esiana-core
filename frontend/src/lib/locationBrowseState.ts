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

export function groupLocationBrowseChildren(
  children: readonly CategoryIndexChild[], regionFor: (child: CategoryIndexChild) => string | null,
): [string, CategoryIndexChild[]][] {
  const groups = new Map<string, CategoryIndexChild[]>();
  for (const child of children) {
    const label = regionFor(child) || 'No region';
    const items = groups.get(label) ?? [];
    items.push(child);
    groups.set(label, items);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
