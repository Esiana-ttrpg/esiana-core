export type GmStyleTagEntry = {
  slug: string;
  label: string;
};

export const GM_STYLE_TAGS: GmStyleTagEntry[] = [
  { slug: 'narrative-focused', label: 'Narrative-focused' },
  { slug: 'beginner-friendly', label: 'Beginner Friendly' },
  { slug: 'heavy-rp', label: 'Heavy RP' },
  { slug: 'tactical-combat', label: 'Tactical Combat' },
  { slug: 'lgbtq-friendly', label: 'LGBTQ+ Friendly' },
  { slug: 'long-campaigns', label: 'Long Campaigns' },
  { slug: 'one-shots', label: 'One-Shots' },
  { slug: 'rules-light', label: 'Rules Light' },
  { slug: 'rules-heavy', label: 'Rules Heavy' },
  { slug: 'session-zero', label: 'Session Zero' },
  { slug: 'inclusive-table', label: 'Inclusive Table' },
  { slug: 'voice-required', label: 'Voice Required' },
  { slug: 'accessibility-conscious', label: 'Accessibility-Conscious' },
];

const SLUG_SET = new Set(GM_STYLE_TAGS.map((entry) => entry.slug));

export function getGmStyleTagLabel(slug: string): string {
  const match = GM_STYLE_TAGS.find((entry) => entry.slug === slug);
  if (match) return match.label;
  return slug.trim();
}

export function isCatalogGmStyleSlug(value: string): boolean {
  return SLUG_SET.has(value);
}

export function sanitizeGmStyleTags(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of values) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.slice(0, 24);
}
