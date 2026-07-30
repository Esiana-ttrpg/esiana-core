import type { CSSProperties } from 'react';
import type { CampaignSummary } from '@/types/campaign';
import type { HubContinueCandidate, HubMomentum } from '@/types/hub';
import {
  brandingToThemeProfile,
  DEFAULT_THEME_PROFILE,
  getProfilePreviewPalette,
  normalizeThemeProfile,
  type ThemeProfile,
} from '@/lib/theme/themeProfile';

export type HubMomentumLabel = HubMomentum['label'];

/** Semantic status tokens for hub momentum chips (see hub-ambient.css). */
export const HUB_MOMENTUM_TONE_CLASS: Record<HubMomentumLabel, string> = {
  strong:
    'hub-momentum--strong border-[color:var(--color-status-warning-border)] bg-[color:var(--color-status-warning-bg)] text-[color:var(--color-status-warning-fg)]',
  steady:
    'hub-momentum--steady border-[color:var(--color-status-legend-border)] bg-[color:var(--color-status-legend-bg)] text-[color:var(--color-status-legend-fg)]',
  fading:
    'hub-momentum--fading border-[color:var(--color-status-muted-border)] bg-[color:var(--color-status-muted-bg)] text-[color:var(--color-status-muted-fg)]',
  stalled:
    'hub-momentum--stalled border-[color:var(--color-status-neutral-border)] bg-[color:var(--color-status-neutral-bg)] text-[color:var(--color-status-neutral-fg)]',
};

export type HubSectionVariant = 'resume' | 'library' | 'attention' | 'recent' | 'page';

const SECTION_VAR_MAP: Record<HubSectionVariant, string> = {
  resume: '--hub-section-resume',
  library: '--hub-section-library',
  attention: '--hub-section-attention',
  recent: '--hub-section-recent',
  page: '--hub-accent',
};

export function resolveThemeAccentColor(profile: ThemeProfile): string {
  return getProfilePreviewPalette(profile).primary;
}

export function resolveCampaignAccentColor(
  campaign: CampaignSummary,
  themeFallback?: string,
): string {
  const fallback = themeFallback ?? resolveThemeAccentColor(DEFAULT_THEME_PROFILE);
  const profile = brandingToThemeProfile({
    appearanceProfile: campaign.appearanceProfile,
    globalThemePreset: 'dark',
  });
  return getProfilePreviewPalette(profile).primary ?? fallback;
}

export function resolveDominantHubCampaign(
  campaigns: CampaignSummary[],
  pinnedIds: string[],
  resumeHero: HubContinueCandidate[],
): CampaignSummary | null {
  for (const id of pinnedIds) {
    const match = campaigns.find((c) => c.id === id);
    if (match) return match;
  }
  return resumeHero[0]?.campaign ?? null;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [r, g, b];
}

function hexToRgbString(hex: string, fallback: string): string {
  const rgb = hexToRgb(hex);
  return rgb ? `${rgb[0]}, ${rgb[1]}, ${rgb[2]}` : fallback;
}

export function blendAccentWithSemantic(dominant: string, semantic: string, ratio = 0.2): string {
  const d = hexToRgb(dominant);
  const s = hexToRgb(semantic);
  if (!d || !s) return semantic;
  const r = Math.round(d[0] * (1 - ratio) + s[0] * ratio);
  const g = Math.round(d[1] * (1 - ratio) + s[1] * ratio);
  const b = Math.round(d[2] * (1 - ratio) + s[2] * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function getHubSectionAccent(variant: HubSectionVariant): string {
  return `var(${SECTION_VAR_MAP[variant]})`;
}

export function isTransDualToneProfile(themeProfile: ThemeProfile): boolean {
  return normalizeThemeProfile(themeProfile).identity === 'trans';
}

interface TransHubSectionTokens {
  sectionLibrary: string;
  sectionAttention: string;
  sectionRecent: string;
}

function buildTransHubSectionTokens(primary: string, accentPink: string): TransHubSectionTokens {
  return {
    sectionLibrary: blendAccentWithSemantic(primary, accentPink, 0.5),
    sectionAttention: blendAccentWithSemantic(primary, accentPink, 0.5),
    sectionRecent: blendAccentWithSemantic(primary, accentPink, 0.55),
  };
}

export function buildHubAmbientTokens(themeProfile: ThemeProfile): CSSProperties {
  const normalized = normalizeThemeProfile(themeProfile);
  const themePalette = getProfilePreviewPalette(normalized);
  const accent = themePalette.primary;
  const isTransDualTone = normalized.identity === 'trans';

  const semantic = {
    library: themePalette.primary,
    attention: themePalette.accent,
    recent: themePalette.primaryHover,
  };

  const transSections = isTransDualTone
    ? buildTransHubSectionTokens(accent, themePalette.accent)
    : null;

  const sectionLibrary = transSections
    ? transSections.sectionLibrary
    : blendAccentWithSemantic(accent, semantic.library, 0.2);
  const sectionAttention = transSections
    ? transSections.sectionAttention
    : blendAccentWithSemantic(accent, semantic.attention, 0.2);
  const sectionRecent = transSections
    ? transSections.sectionRecent
    : blendAccentWithSemantic(accent, semantic.recent, 0.2);

  const accentRgb = hexToRgbString(accent, hexToRgbString(resolveThemeAccentColor(DEFAULT_THEME_PROFILE), '56, 189, 248'));

  const tokens: Record<string, string> = {
    '--hub-accent': accent,
    '--hub-accent-muted': `rgba(${accentRgb}, 0.35)`,
    '--hub-accent-glow': `rgba(${accentRgb}, 0.18)`,
    '--hub-accent-rgb': accentRgb,
    '--hub-section-resume': accent,
    '--hub-section-library': sectionLibrary,
    '--hub-section-attention': sectionAttention,
    '--hub-section-recent': sectionRecent,
    '--hub-section-library-rgb': hexToRgbString(sectionLibrary, accentRgb),
    '--hub-section-attention-rgb': hexToRgbString(sectionAttention, accentRgb),
    '--hub-section-recent-rgb': hexToRgbString(sectionRecent, accentRgb),
  };

  if (isTransDualTone) {
    const atmosphereRgb = hexToRgbString(themePalette.accent, accentRgb);
    tokens['--hub-atmosphere-rgb'] = atmosphereRgb;
    tokens['--hub-atmosphere-glow'] = `rgba(${atmosphereRgb}, 0.14)`;
    tokens['--hub-atmosphere-muted'] = `rgba(${atmosphereRgb}, 0.35)`;
    tokens['--hub-narrative-end'] = themePalette.accent;
  }

  return tokens as CSSProperties;
}

export function accentGlowShadow(accentColor: string, strength = 0.25): string {
  const rgb = hexToRgb(accentColor);
  if (!rgb) return 'none';
  return `0 4px 24px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${strength}), 0 0 1px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${strength * 0.6})`;
}
