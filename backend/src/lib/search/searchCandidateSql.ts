/**
 * Portable LIKE pattern helpers for the derived-table candidate stage
 * (SQLite portable-like engine). Over-select is allowed; under-select of
 * advertised searchable content is not.
 *
 * Indexed text is pre-normalized (ASCII-folded lowercase). Non-ASCII /
 * JSON-escape chars in query tokens are still widened to `_` for safety.
 */

/** Escape LIKE wildcards and then widen non-ASCII / JSON-escape chars to `_`. */
export function buildCandidateLikePattern(token: string): string {
  let escaped = '';
  for (const ch of token) {
    if (ch === '\\' || ch === '%' || ch === '_') {
      escaped += `\\${ch}`;
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    const isAsciiLetterOrDigit =
      (code >= 0x30 && code <= 0x39) ||
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a);
    const isSafeAsciiPunct = ch === ' ' || ch === '-' || ch === "'" || ch === '.' || ch === ',';
    if (isAsciiLetterOrDigit || isSafeAsciiPunct) {
      escaped += ch;
      continue;
    }
    escaped += '_';
  }
  return `%${escaped}%`;
}

/** Batch size for one page of engine candidates. */
export const SEARCH_CANDIDATE_BATCH = 100;

/**
 * Hard ceiling on candidates scanned per search request.
 * Prevents unbounded work on extremely broad queries while still far above
 * the old LIMIT 200 single-token compromise.
 */
export const SEARCH_CANDIDATE_CEILING = 2000;
