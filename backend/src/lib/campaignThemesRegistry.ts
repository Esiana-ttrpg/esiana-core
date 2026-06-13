export type CampaignThemeEntry = {
  slug: string;
  label: string;
  category: string;
};

export const CAMPAIGN_THEME_CATEGORIES = [
  'Fantasy & Myth',
  'Sci-Fi & Future',
  'Historical & Alt-History',
  'Horror & Thriller',
  'Urban & Modern',
  'Campaign Structure',
] as const;

export const CAMPAIGN_THEMES: CampaignThemeEntry[] = [
  // Fantasy & Myth
  {
    slug: 'high-fantasy-heroic',
    label: 'High Fantasy / Heroic',
    category: 'Fantasy & Myth',
  },
  {
    slug: 'dark-fantasy-grimdark',
    label: 'Dark Fantasy / Grimdark',
    category: 'Fantasy & Myth',
  },
  {
    slug: 'sword-and-sorcery',
    label: 'Sword & Sorcery',
    category: 'Fantasy & Myth',
  },
  {
    slug: 'mythic-antiquity',
    label: 'Mythic Antiquity',
    category: 'Fantasy & Myth',
  },
  {
    slug: 'arthurian-romance',
    label: 'Arthurian Romance',
    category: 'Fantasy & Myth',
  },
  {
    slug: 'feywild-enchanted-forest',
    label: 'Feywild / Enchanted Forest',
    category: 'Fantasy & Myth',
  },
  {
    slug: 'eastern-fantasy-wuxia',
    label: 'Eastern Fantasy / Wuxia',
    category: 'Fantasy & Myth',
  },

  // Sci-Fi & Future
  { slug: 'space-opera', label: 'Space Opera', category: 'Sci-Fi & Future' },
  { slug: 'hard-sci-fi', label: 'Hard Sci-Fi', category: 'Sci-Fi & Future' },
  { slug: 'cyberpunk', label: 'Cyberpunk', category: 'Sci-Fi & Future' },
  {
    slug: 'biopunk-gene-splicing',
    label: 'Biopunk / Gene-Splicing',
    category: 'Sci-Fi & Future',
  },
  {
    slug: 'mecha-tactical-armor',
    label: 'Mecha / Tactical Armor',
    category: 'Sci-Fi & Future',
  },
  {
    slug: 'retro-futurism-atompunk',
    label: 'Retro-Futurism / Atompunk',
    category: 'Sci-Fi & Future',
  },
  {
    slug: 'post-apocalyptic-wasteland',
    label: 'Post-Apocalyptic Wasteland',
    category: 'Sci-Fi & Future',
  },
  { slug: 'steampunk', label: 'Steampunk', category: 'Sci-Fi & Future' },
  { slug: 'dieselpunk', label: 'Dieselpunk', category: 'Sci-Fi & Future' },
  {
    slug: 'gaslamp-fantasy',
    label: 'Gaslamp Fantasy',
    category: 'Sci-Fi & Future',
  },

  // Historical & Alt-History
  {
    slug: 'pirates-high-seas',
    label: 'Pirates & High Seas',
    category: 'Historical & Alt-History',
  },
  {
    slug: 'wild-west-weird-west',
    label: 'Wild West / Weird West',
    category: 'Historical & Alt-History',
  },
  {
    slug: 'samurai-cinema-feudal',
    label: 'Samurai Cinema / Feudal',
    category: 'Historical & Alt-History',
  },
  {
    slug: 'alternate-history',
    label: 'Alternate History',
    category: 'Historical & Alt-History',
  },

  // Horror & Thriller
  {
    slug: 'cosmic-horror',
    label: 'Cosmic Horror',
    category: 'Horror & Thriller',
  },
  {
    slug: 'gothic-horror',
    label: 'Gothic Horror',
    category: 'Horror & Thriller',
  },
  {
    slug: 'survival-horror',
    label: 'Survival Horror',
    category: 'Horror & Thriller',
  },
  {
    slug: 'noir-detective',
    label: 'Noir Detective',
    category: 'Horror & Thriller',
  },
  {
    slug: 'psychological-thriller',
    label: 'Psychological Thriller',
    category: 'Horror & Thriller',
  },
  { slug: 'folk-horror', label: 'Folk Horror', category: 'Horror & Thriller' },
  {
    slug: 'slasher-grindhouse',
    label: 'Slasher / Grindhouse',
    category: 'Horror & Thriller',
  },

  // Urban & Modern
  {
    slug: 'urban-fantasy',
    label: 'Urban Fantasy',
    category: 'Urban & Modern',
  },
  {
    slug: 'magical-girls-dual-identity',
    label: 'Magical Girls / Dual Identity',
    category: 'Urban & Modern',
  },
  {
    slug: 'superheroes-vigilantes',
    label: 'Superheroes / Vigilantes',
    category: 'Urban & Modern',
  },
  {
    slug: 'spies-espionage',
    label: 'Spies & Espionage',
    category: 'Urban & Modern',
  },
  {
    slug: 'meiji-taisho-industrial',
    label: 'Meiji / Taisho Industrial',
    category: 'Urban & Modern',
  },
  {
    slug: 'pop-postmodern-retro-80s',
    label: 'Pop-Postmodern / Retro 80s',
    category: 'Urban & Modern',
  },
  {
    slug: 'cozy-solarpunk',
    label: 'Cozy / Solarpunk',
    category: 'Urban & Modern',
  },

  // Campaign Structure
  {
    slug: 'heist-criminal-underworld',
    label: 'Heist / Criminal Underworld',
    category: 'Campaign Structure',
  },
  {
    slug: 'political-intrigue-noble-houses',
    label: 'Political Intrigue / Noble Houses',
    category: 'Campaign Structure',
  },
  {
    slug: 'military-war-campaign',
    label: 'Military / War Campaign',
    category: 'Campaign Structure',
  },
  {
    slug: 'survival-hexcrawl',
    label: 'Survival / Hexcrawl',
    category: 'Campaign Structure',
  },
  {
    slug: 'dungeon-crawler',
    label: 'Dungeon Crawler',
    category: 'Campaign Structure',
  },
  {
    slug: 'planar-travel-multiverse',
    label: 'Planar Travel / Multiverse',
    category: 'Campaign Structure',
  },
  {
    slug: 'time-travel-chrono-trigger',
    label: 'Time Travel / Chrono-Trigger',
    category: 'Campaign Structure',
  },
  {
    slug: 'isekai-portal-fantasy',
    label: 'Isekai / Portal Fantasy',
    category: 'Campaign Structure',
  },
];

export const CAMPAIGN_THEME_SLUGS = new Set(CAMPAIGN_THEMES.map((t) => t.slug));

/** Legacy wizard chip labels mapped to catalog slugs. */
export const LEGACY_THEME_MAP: Record<string, string> = {
  Fantasy: 'high-fantasy-heroic',
  Horror: 'gothic-horror',
  Cyberpunk: 'cyberpunk',
};

const LABEL_LOOKUP = new Map(
  CAMPAIGN_THEMES.map((entry) => [entry.label.toLowerCase(), entry.slug]),
);

export function isCatalogThemeSlug(slug: string): boolean {
  return CAMPAIGN_THEME_SLUGS.has(slug);
}

export function normalizeThemeSlug(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (CAMPAIGN_THEME_SLUGS.has(trimmed)) return trimmed;
  const legacy = LEGACY_THEME_MAP[trimmed];
  if (legacy) return legacy;
  const byLabel = LABEL_LOOKUP.get(trimmed.toLowerCase());
  if (byLabel) return byLabel;
  return trimmed;
}

export function getCampaignThemeEntry(
  value: string | null | undefined,
): CampaignThemeEntry | undefined {
  if (!value) return undefined;
  const normalized = normalizeThemeSlug(value);
  if (!normalized || !CAMPAIGN_THEME_SLUGS.has(normalized)) return undefined;
  return CAMPAIGN_THEMES.find((entry) => entry.slug === normalized);
}

export function getCampaignThemeLabel(value: string | null | undefined): string {
  if (!value) return '';
  const normalized = normalizeThemeSlug(value);
  if (!normalized) return value.trim();
  const entry = CAMPAIGN_THEMES.find((t) => t.slug === normalized);
  return entry?.label ?? value.trim();
}

export function isCustomThemeValue(value: string): boolean {
  const normalized = normalizeThemeSlug(value);
  if (!normalized) return false;
  return !CAMPAIGN_THEME_SLUGS.has(normalized);
}

export function getCampaignThemesByCategory(): Map<string, CampaignThemeEntry[]> {
  const map = new Map<string, CampaignThemeEntry[]>();
  for (const category of CAMPAIGN_THEME_CATEGORIES) {
    map.set(
      category,
      CAMPAIGN_THEMES.filter((entry) => entry.category === category),
    );
  }
  return map;
}

export function resolveCampaignThemeLabels(values: string[]): string[] {
  return values.map((value) => getCampaignThemeLabel(value)).filter(Boolean);
}
