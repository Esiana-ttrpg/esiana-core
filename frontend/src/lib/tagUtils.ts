/** Lenient slug: lowercase hyphenated identifier (e.g. quest-one). */
export function slugifyTagName(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';

  let slug = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  slug = slug.replace(/[^a-z0-9]+$/g, '').replace(/-+$/g, '');
  return slug;
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
