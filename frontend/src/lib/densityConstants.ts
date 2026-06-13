/** Enforceable density limits — see docs/density-doctrine.md */

export const ULTRAWIDE_BREAKPOINT_PX = 1920;

/** Hard ceiling for reading prose — semantic cap, not viewport-derived. */
export const MAX_READING_MEASURE_CH = 100;

/** Tier caps for multi-measure codex surfaces (ch units, no viewport math). */
export const CODEX_READABLE_CH_TIGHT = 72;
export const CODEX_READABLE_CH_STANDARD = 86;
export const CODEX_READABLE_CH_HYBRID = 100;
/** Default active measure when no page context is applied. */
export const CODEX_READABLE_CH_DEFAULT = 92;

/** Longform fiction / journals — standard and wide reading layouts. */
export const READING_MEASURE_TIGHT_STANDARD_CH = 72;
export const READING_MEASURE_TIGHT_WIDE_CH = 76;

/** Standard lore prose. */
export const READING_MEASURE_STANDARD_STANDARD_CH = 84;
export const READING_MEASURE_STANDARD_WIDE_CH = 94;

/** Hybrid codex / reference surfaces (characters, session notes, structured embeds). */
export const READING_MEASURE_HYBRID_STANDARD_CH = 92;
export const READING_MEASURE_HYBRID_WIDE_CH = 100;

/** Writing mode — slightly wider than reading within each tier. */
export const WRITING_MEASURE_TIGHT_STANDARD_CH = 76;
export const WRITING_MEASURE_TIGHT_WIDE_CH = 80;
export const WRITING_MEASURE_STANDARD_STANDARD_CH = 86;
export const WRITING_MEASURE_STANDARD_WIDE_CH = 90;
export const WRITING_MEASURE_HYBRID_STANDARD_CH = 92;
export const WRITING_MEASURE_HYBRID_WIDE_CH = 100;

/** @deprecated Use tier-specific constants; kept for legacy imports. */
export const READING_MEASURE_STANDARD_CH = READING_MEASURE_STANDARD_STANDARD_CH;
/** @deprecated Use tier-specific constants; kept for legacy imports. */
export const READING_MEASURE_WIDE_CH = READING_MEASURE_STANDARD_WIDE_CH;
/** @deprecated Use tier-specific constants; kept for legacy imports. */
export const WRITING_MEASURE_STANDARD_CH = WRITING_MEASURE_STANDARD_STANDARD_CH;
/** @deprecated Use tier-specific constants; kept for legacy imports. */
export const WRITING_MEASURE_WIDE_CH = WRITING_MEASURE_STANDARD_WIDE_CH;

export const DASHBOARD_DEFAULT_MAX_ENABLED_WIDGETS = 6;

export const DASHBOARD_MAX_ENABLED_WIDGETS = 10;

export const SIDEBAR_WIDTH_REM = 18;

export const MAX_BORDERED_CARD_NESTING = 2;

export const MAX_METADATA_LINES_READING = 2;

export const MAX_METADATA_LINES_WRITING = 4;

export const MAX_VISIBLE_HERO_PILLS = 3;

export type CodexMeasureTier = 'tight' | 'standard' | 'hybrid';

export const CODEX_MEASURE_TIER_CSS_VAR: Record<CodexMeasureTier, string> = {
  tight: '--codex-readable-ch-tight',
  standard: '--codex-readable-ch-standard',
  hybrid: '--codex-readable-ch-hybrid',
};

export const CODEX_MEASURE_TIER_CAP_CH: Record<CodexMeasureTier, number> = {
  tight: CODEX_READABLE_CH_TIGHT,
  standard: CODEX_READABLE_CH_STANDARD,
  hybrid: CODEX_READABLE_CH_HYBRID,
};
