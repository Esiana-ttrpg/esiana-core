import type { IdentityId } from './appearancePresets';

/** Zone chroma caps — prevents long-term spectacle creep across seasons. */
export interface SaturationBudget {
  globalMax: number;
  /** Absolute zero — prose silence is non-negotiable. */
  proseMax: number;
  sidebarMax: number;
  heroMax: number;
  /** Event overlay layer ceiling. */
  overlayMax: number;
}

export type ChromaZone = 'prose' | 'sidebar' | 'hero' | 'overlay' | 'global' | 'hover';

const DEFAULT_BUDGET: SaturationBudget = {
  globalMax: 0.35,
  proseMax: 0,
  sidebarMax: 0.2,
  heroMax: 0.45,
  overlayMax: 0.25,
};

export function resolveSaturationBudget(
  _eventOverlay?: IdentityId,
): SaturationBudget {
  return { ...DEFAULT_BUDGET };
}

export function clampChroma(
  zone: ChromaZone,
  value: number,
  budget: SaturationBudget,
): number {
  const cap =
    zone === 'prose'
      ? budget.proseMax
      : zone === 'sidebar'
        ? budget.sidebarMax
        : zone === 'hero'
          ? budget.heroMax
          : zone === 'overlay'
            ? budget.overlayMax
            : budget.globalMax;
  return Math.min(Math.max(0, value), cap);
}
