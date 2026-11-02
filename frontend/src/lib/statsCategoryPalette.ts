import type { StatsCategory } from '@shared/statsTypes';

/**
 * Chart series colors for personal statistics.
 * Values resolve through `--stats-*` CSS vars, which derive from theme tokens
 * (`--color-primary`, `--color-accent`, accent family) so custom themes track.
 */
export const STATS_CATEGORY_CSS_VAR: Record<StatsCategory, string> = {
  writing: 'var(--stats-writing)',
  worldbuilding: 'var(--stats-worldbuilding)',
  maps: 'var(--stats-maps)',
  chronology: 'var(--stats-chronology)',
  campaigns: 'var(--stats-campaigns)',
};

/** Current vs previous series pairing for dual-period charts. */
export const STATS_SERIES = {
  current: 'var(--stats-writing)',
  previous: 'var(--stats-worldbuilding)',
} as const;
