import type { CSSProperties } from 'react';
import type { DashboardHeroConfig } from './dashboardConfig';

export const HERO_MODES = ['compact', 'standard', 'cinematic'] as const;
export type HeroMode = (typeof HERO_MODES)[number];

export interface HeroModeMeta {
  label: string;
  description: string;
  sectionMinHeight: string;
  contentPadding: string;
  titleClass: string;
  taglineClass: string;
}

export const HERO_MODE_META: Record<HeroMode, HeroModeMeta> = {
  compact: {
    label: 'Compact',
    description: 'Short banner — great for mobile-heavy tables and long dashboards.',
    sectionMinHeight: 'min-h-[140px] sm:min-h-[160px]',
    contentPadding: 'px-5 pb-5 pt-1 sm:px-6 sm:pb-6',
    titleClass: 'text-2xl font-bold tracking-tight sm:text-3xl',
    taglineClass: 'max-w-3xl text-sm leading-relaxed text-foreground/90',
  },
  standard: {
    label: 'Standard',
    description: 'Balanced presentation — the default campaign home look.',
    sectionMinHeight: 'min-h-[200px] sm:min-h-[240px]',
    contentPadding: 'px-6 pb-6 pt-2 sm:px-8 sm:pb-8',
    titleClass: 'text-3xl font-bold tracking-tight sm:text-4xl',
    taglineClass: 'max-w-3xl text-sm leading-relaxed text-foreground/90 sm:text-base',
  },
  cinematic: {
    label: 'Cinematic',
    description: 'Tall immersive banner — best for strong art and atmospheric worlds.',
    sectionMinHeight: 'min-h-[280px] sm:min-h-[360px]',
    contentPadding: 'px-6 pb-8 pt-3 sm:px-8 sm:pb-10',
    titleClass: 'text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-tight',
    taglineClass: 'max-w-3xl text-base leading-relaxed text-foreground/90 sm:text-lg',
  },
};

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

export function normalizeHeroFields(raw: unknown): DashboardHeroConfig {
  if (!raw || typeof raw !== 'object') {
    return createDefaultHeroConfig();
  }

  const hero = raw as Record<string, unknown>;
  const heroMode = parseHeroMode(hero.heroMode);
  const hasOverlay =
    typeof hero.overlayStrength === 'number' && Number.isFinite(hero.overlayStrength);

  return {
    coverImageUrl:
      typeof hero.coverImageUrl === 'string' && hero.coverImageUrl.trim()
        ? hero.coverImageUrl.trim()
        : null,
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

export function getHeroLayoutClasses(hero: DashboardHeroConfig): {
  section: string;
  content: string;
  title: string;
  tagline: string;
} {
  const meta = HERO_MODE_META[hero.heroMode] ?? HERO_MODE_META.standard;
  return {
    section: meta.sectionMinHeight,
    content: meta.contentPadding,
    title: meta.titleClass,
    tagline: meta.taglineClass,
  };
}

export function buildHeroCoverStyle(hero: DashboardHeroConfig): CSSProperties | undefined {
  if (!hero.coverImageUrl) return undefined;
  const x = clampUnit(hero.focalPointX, 0.5);
  const y = clampUnit(hero.focalPointY, 0.5);
  return {
    backgroundImage: `url(${hero.coverImageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: `${x * 100}% ${y * 100}%`,
  };
}

export function buildHeroArtOverlayStyle(hero: DashboardHeroConfig): CSSProperties {
  const strength = clampUnit(hero.overlayStrength, defaultOverlayStrength(hero.heroMode));
  const top = Math.round(strength * 0.35 * 100) / 100;
  const mid = Math.round(strength * 0.75 * 100) / 100;
  const bottom = Math.min(0.98, strength + 0.2);
  return {
    background: `linear-gradient(to bottom, rgba(2,6,23,${top}), rgba(2,6,23,${mid}), rgba(2,6,23,${bottom}))`,
  };
}

export function buildHeroPreviewFrameStyle(hero: DashboardHeroConfig): CSSProperties {
  const minHeights: Record<HeroMode, string> = {
    compact: '140px',
    standard: '200px',
    cinematic: '280px',
  };
  const mode = hero.heroMode in minHeights ? hero.heroMode : 'standard';
  return {
    position: 'relative',
    minHeight: minHeights[mode],
    borderRadius: '0.75rem',
    overflow: 'hidden',
    ...(buildHeroCoverStyle(hero) ?? { backgroundColor: 'var(--elevated, #1e293b)' }),
  };
}
