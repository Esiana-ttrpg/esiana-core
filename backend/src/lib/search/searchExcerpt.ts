import type { GlobalSearchExcerpt } from '../../../../shared/globalSearch.js';
import type { SearchDocumentField } from './searchRanking.js';

const DEFAULT_RADIUS = 60;

/**
 * Build a short excerpt around the first query-token hit in a field.
 * Returns null when no token is found (caller should omit the excerpt).
 */
export function buildSearchExcerpt(
  field: SearchDocumentField,
  tokens: string[],
  radius = DEFAULT_RADIUS,
): GlobalSearchExcerpt | null {
  if (!field.text.trim() || tokens.length === 0) return null;

  const lower = field.text.toLowerCase();
  let hitIndex = -1;
  let hitLength = 0;
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx >= 0 && (hitIndex < 0 || idx < hitIndex)) {
      hitIndex = idx;
      hitLength = token.length;
    }
  }
  if (hitIndex < 0) return null;

  const start = Math.max(0, hitIndex - radius);
  const end = Math.min(field.text.length, hitIndex + hitLength + radius);
  let snippet = field.text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < field.text.length) snippet = `${snippet}…`;

  return {
    text: snippet,
    field: field.label,
  };
}
