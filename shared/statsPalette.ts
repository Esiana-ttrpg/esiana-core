export const STATS_CATEGORY_KEYS = [
  'writing',
  'worldbuilding',
  'maps',
  'chronology',
  'campaigns',
] as const;

export type StatsPaletteCategory = (typeof STATS_CATEGORY_KEYS)[number];

/** CSS custom properties for the small stats category palette. */
export const STATS_CATEGORY_TOKEN: Record<StatsPaletteCategory, string> = {
  writing: '--stats-writing',
  worldbuilding: '--stats-worldbuilding',
  maps: '--stats-maps',
  chronology: '--stats-chronology',
  campaigns: '--stats-campaigns',
};
