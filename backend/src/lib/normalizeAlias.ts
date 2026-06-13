/**
 * Normalize wiki alias / title strings for lookup and deduplication.
 */
export function normalizeAlias(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .trim();
}
