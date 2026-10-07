import type { CharacterPageDescriptor } from '@shared/characterPages';

/** A user-controlled Manage Page named Downtime opts into the Hireling projection. */
export function isHirelingDowntimeManagedPage(page: CharacterPageDescriptor | null): boolean {
  return page?.renderMode === 'CANVAS' && page.title.trim().toLowerCase() === 'downtime';
}
