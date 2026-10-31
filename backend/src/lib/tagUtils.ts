import { normalizePathKey } from '../../../shared/pathKeyUtils.js';

/**
 * Tag name/label helpers for campaign wiki tags.
 */

/** Lenient slug: lowercase hyphenated identifier (e.g. quest-one). */
export function slugifyTagName(input: string): string {
  return normalizePathKey(input);
}

/** Human-readable label from a slug when the client omits label. */
export function labelFromTagName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';

  return trimmed
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
