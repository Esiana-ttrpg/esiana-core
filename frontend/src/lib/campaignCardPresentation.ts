import type { CSSProperties } from 'react';
import type { CampaignSummary } from '@/types/campaign';
import { normalizeHeroFields } from '@/lib/dashboardHeroPresentation';

const GRADIENT_PAIRS = [
  ['#1e1b4b', '#4c1d95'],
  ['#134e4a', '#312e81'],
  ['#1e293b', '#581c87'],
  ['#172554', '#4a044e'],
  ['#0f172a', '#5b21b6'],
  ['#164e63', '#3730a3'],
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
  const index = hashString(seed) % GRADIENT_PAIRS.length;
  const [from, to] = GRADIENT_PAIRS[index]!;
  return {
    backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
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
