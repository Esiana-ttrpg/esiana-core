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
  return SLUG_SET.has(value.trim().toLowerCase());
}

export function normalizeGmStyleTags(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const slug = raw.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push(slug);
  }
  return result;
}
