/**
 * Explicit rate-limit coverage exemptions.
 * Every entry must include a documented reason. Prefer covering routes
 * at the host/router mount instead of exempting them.
 */
export interface RateLimitCoverageExemption {
  method: string;
  /** Absolute path pattern as reported by the coverage walker (e.g. `/api/health/`). */
  path: string;
  reason: string;
}

/**
 * Currently empty: every statically mounted HTTP operation must have at least
 * one effective rate-limit policy. Dynamic plugin-runtime routes inherit
 * host-level policies from `mountPluginHost` / `mountPublicPluginHost` and
 * are not inventoried here (they are not present until plugin bootstrap).
 */
export const RATE_LIMIT_COVERAGE_EXEMPTIONS: RateLimitCoverageExemption[] = [];
