import type { EntitySubviewId } from '@/lib/entityPageShells/types';

/** Dedicated prose-writing subviews where block chrome should be suppressed in edit mode. */
const PROSE_PRIMARY_SUBVIEWS = new Set<EntitySubviewId>(['lore', 'biography']);

export function isProsePrimarySubview(
  pageSubview: EntitySubviewId,
  isEventLorePage: boolean,
  isEditingPage: boolean,
): boolean {
  if (!isEditingPage) return false;
  if (isEventLorePage) return true;
  return PROSE_PRIMARY_SUBVIEWS.has(pageSubview);
}
