/**
 * Content priority collapse — responsive narrative systems degrade semantically,
 * not via horizontal scroll. See docs/density-doctrine.md.
 */

export type ContentPriority = 'primary' | 'secondary' | 'tertiary' | 'operator';

export interface PriorityColumnDef {
  key: string;
  priority: ContentPriority;
}

const PRIORITY_RANK: Record<ContentPriority, number> = {
  primary: 0,
  secondary: 1,
  tertiary: 2,
  operator: 3,
};

/** Breakpoints for progressive column visibility in operator table mode. */
export const PRIORITY_VIEWPORT_MD_PX = 768;
export const PRIORITY_VIEWPORT_LG_PX = 1024;
export const PRIORITY_VIEWPORT_XL_PX = 1280;

/**
 * Returns columns visible at the given viewport width.
 * Primary always shown; secondary from md; tertiary from lg; operator from xl.
 */
export function visibleColumnsForViewport<T extends PriorityColumnDef>(
  columns: T[],
  viewportWidth: number,
): T[] {
  const maxRank =
    viewportWidth >= PRIORITY_VIEWPORT_XL_PX
      ? PRIORITY_RANK.operator
      : viewportWidth >= PRIORITY_VIEWPORT_LG_PX
        ? PRIORITY_RANK.tertiary
        : viewportWidth >= PRIORITY_VIEWPORT_MD_PX
          ? PRIORITY_RANK.secondary
          : PRIORITY_RANK.primary;

  return columns.filter((col) => PRIORITY_RANK[col.priority] <= maxRank);
}

/** Catalog tiles: primary fields plus optional secondary when space allows. */
export function catalogFieldsForTile<T extends PriorityColumnDef>(
  columns: T[],
  maxPrimary = 3,
  maxSecondary = 2,
): { primary: T[]; secondary: T[] } {
  const primary = columns.filter((c) => c.priority === 'primary').slice(0, maxPrimary);
  const secondary = columns
    .filter((c) => c.priority === 'secondary')
    .slice(0, maxSecondary);
  return { primary, secondary };
}

export function defaultPriorityForColumnIndex(index: number): ContentPriority {
  if (index === 0) return 'primary';
  if (index <= 2) return 'secondary';
  if (index <= 4) return 'tertiary';
  return 'operator';
}

/** Sentinel quickInfo / index values that should render as empty in operator tables. */
export function isEmptyIndexValue(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return true;
  const normalized = value.trim().toUpperCase();
  return normalized === 'UNKNOWN' || normalized === '—' || normalized === '-';
}

/** Returns display text for a table cell, or null when the value is a sentinel empty. */
export function formatIndexCellDisplay(value: string | null | undefined): string | null {
  if (isEmptyIndexValue(value)) return null;
  return value!.trim();
}

export function countHiddenColumnsForViewport<T extends PriorityColumnDef>(
  columns: T[],
  viewportWidth: number,
): number {
  const visible = visibleColumnsForViewport(columns, viewportWidth);
  return Math.max(0, columns.length - visible.length);
}
