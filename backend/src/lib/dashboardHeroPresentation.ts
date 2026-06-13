/**
 * Campaign home hero presentation (banner mode, focal point, overlay).
 */

import { coerceAssetReferenceUrl } from '../../../shared/assetReferenceValidation.js';

export const HERO_MODES = ['compact', 'standard', 'cinematic'] as const;
export type HeroMode = (typeof HERO_MODES)[number];

export interface DashboardHeroConfig {
  coverImageUrl: string | null;
  /** Optional narrative arc title for campaign home and global hub. */
  currentArc?: string | null;
  summary: string | null;
  heroMode: HeroMode;
  focalPointX: number;
  focalPointY: number;
  overlayStrength: number;
}

export function defaultOverlayStrength(mode: HeroMode): number {
  switch (mode) {
    case 'compact':
      return 0.45;
    case 'cinematic':
      return 0.65;
    default:
      return 0.55;
  }
}

export function clampUnit(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function parseHeroMode(raw: unknown): HeroMode {
  if (typeof raw === 'string' && HERO_MODES.includes(raw as HeroMode)) {
    return raw as HeroMode;
  }
  return 'standard';
}

export function createDefaultHeroConfig(): DashboardHeroConfig {
  const heroMode: HeroMode = 'standard';
  return {
    coverImageUrl: null,
    currentArc: null,
    summary: null,
    heroMode,
    focalPointX: 0.5,
    focalPointY: 0.5,
    overlayStrength: defaultOverlayStrength(heroMode),
  };
}

export function normalizeHeroConfig(raw: unknown): DashboardHeroConfig {
  if (!raw || typeof raw !== 'object') {
    return createDefaultHeroConfig();
  }

  const hero = raw as Record<string, unknown>;
  const heroMode = parseHeroMode(hero.heroMode);
  const hasOverlay =
    typeof hero.overlayStrength === 'number' && Number.isFinite(hero.overlayStrength);

  return {
    coverImageUrl: coerceAssetReferenceUrl(hero.coverImageUrl),
    currentArc:
      typeof hero.currentArc === 'string' && hero.currentArc.trim()
        ? hero.currentArc.trim()
        : null,
    summary:
      typeof hero.summary === 'string' && hero.summary.trim()
        ? hero.summary.trim()
        : null,
    heroMode,
    focalPointX: clampUnit(hero.focalPointX, 0.5),
    focalPointY: clampUnit(hero.focalPointY, 0.5),
    overlayStrength: hasOverlay
      ? clampUnit(hero.overlayStrength, defaultOverlayStrength(heroMode))
      : defaultOverlayStrength(heroMode),
  };
}
