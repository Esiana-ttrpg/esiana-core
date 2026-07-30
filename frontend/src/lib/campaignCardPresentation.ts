import type { CSSProperties } from 'react';
import type { CampaignSummary } from '@/types/campaign';
import { normalizeHeroFields } from '@/lib/dashboardHeroPresentation';

/** Theme-variable gradient recipes (seed picks variant; no fixed palette hex). */
const GRADIENT_RECIPES = [
  'linear-gradient(135deg, var(--color-depth-3) 0%, color-mix(in srgb, var(--color-primary) 65%, var(--color-canvas)) 100%)',
  'linear-gradient(135deg, color-mix(in srgb, var(--color-canvas) 75%, var(--color-primary)) 0%, color-mix(in srgb, var(--color-accent) 50%, var(--color-depth-3)) 100%)',
  'linear-gradient(135deg, var(--color-depth-2) 0%, color-mix(in srgb, var(--color-primary-hover) 60%, var(--color-depth-3)) 100%)',
  'linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 35%, var(--color-canvas)) 0%, color-mix(in srgb, var(--color-accent) 45%, var(--color-depth-3)) 100%)',
  'linear-gradient(125deg, var(--color-canvas) 0%, color-mix(in srgb, var(--color-primary) 55%, var(--color-accent)) 100%)',
  'linear-gradient(135deg, color-mix(in srgb, var(--color-depth-3) 85%, var(--color-accent)) 0%, color-mix(in srgb, var(--color-primary) 70%, var(--color-canvas)) 100%)',
] as const;

function hashString(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function buildCampaignGradientStyle(seed: string): CSSProperties {
  const index = hashString(seed) % GRADIENT_RECIPES.length;
  return {
    backgroundImage: GRADIENT_RECIPES[index]!,
  };
}

export function resolveCampaignHeroUrl(campaign: CampaignSummary): string | null {
  if (campaign.heroImageUrl?.trim()) {
    return campaign.heroImageUrl.trim();
  }
  const config = campaign.dashboardConfig;
  if (!config || typeof config !== 'object') return null;
  const hero = normalizeHeroFields(
    (config as { hero?: unknown }).hero ?? null,
  );
  return hero.coverImageUrl;
}

function isWeakDescription(text: string | null | undefined): boolean {
  if (!text?.trim()) return true;
  const trimmed = text.trim();
  if (trimmed.length < 4) return true;
  if (/^[\w\s—-]{1,20}$/i.test(trimmed) && !trimmed.includes(' ')) return true;
  return false;
}

export function resolveCampaignSummaryText(campaign: CampaignSummary): string | null {
  const tagline = campaign.recruitmentTagline?.trim();
  if (tagline && !isWeakDescription(tagline)) return tagline;
  const description = campaign.description?.trim();
  if (description && !isWeakDescription(description)) return description;
  return null;
}

export function campaignSummaryFallbackText(): string {
  return 'No campaign summary yet.';
}

export function buildCampaignBannerStyle(campaign: CampaignSummary): {
  coverUrl: string | null;
  gradientStyle: CSSProperties;
} {
  const coverUrl = resolveCampaignHeroUrl(campaign);
  const seed = campaign.handle || campaign.id || campaign.name;
  return {
    coverUrl,
    gradientStyle: buildCampaignGradientStyle(seed),
  };
}
