import type { CSSProperties } from 'react';
import type { CampaignSummary } from '@/types/campaign';
import type { HubArcIdentity } from '@/types/hub';
import {
  buildCampaignBannerStyle,
  buildCampaignGradientStyle,
} from '@/lib/campaignCardPresentation';
import { normalizeHeroFields } from '@/lib/dashboardHeroPresentation';
import { accentColorToRgbString, resolveCampaignAccentColor } from '@/lib/hubAmbientTheme';
import { truncateTensionLine } from '@/lib/truncateNarrativeText';

/** Contrast-safe ink for text rendered on photography (independent of page theme). */
export const HUB_ARTWORK_FOREGROUND = 'rgb(245 240 232)';
export const HUB_ARTWORK_FOREGROUND_MUTED = 'rgb(245 240 232 / 0.78)';

export interface CampaignWorldPresentation {
  coverUrl: string | null;
  backdropStyle: CSSProperties;
  overlayStyle: CSSProperties;
  /** CSS vars for artwork-safe type + campaign accent on card roots. */
  cardStyle: CSSProperties;
  accentColor: string;
  accentRgb: string;
  arcTitle: string | null;
  campaignTitle: string;
  tensionLine: string | null;
  continuityLines: string[];
}

function normalizeDisplayText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function buildCoverOverlay(overlayStrength: number, accentRgb: string): string {
  // Localized bottom readability: strong only in lower third; upper art stays clear.
  const bottom = Math.min(0.82, 0.55 + overlayStrength * 0.22);
  const mid = Math.min(0.28, overlayStrength * 0.28);
  const accentWash = `linear-gradient(to top, rgba(${accentRgb}, ${0.12 + overlayStrength * 0.08}) 0%, transparent 45%)`;
  const readability = `linear-gradient(to top, rgba(0,0,0,${bottom}) 0%, rgba(0,0,0,${mid}) 38%, rgba(0,0,0,0.04) 62%, transparent 100%)`;
  return `${accentWash}, ${readability}`;
}

export function buildCampaignWorldPresentation(
  campaign: CampaignSummary,
  arcIdentity?: HubArcIdentity | null,
): CampaignWorldPresentation {
  const { coverUrl, gradientStyle } = buildCampaignBannerStyle(campaign);
  const accentColor = resolveCampaignAccentColor(campaign);
  const accentRgb = accentColorToRgbString(accentColor) ?? '120, 120, 140';
  const seed = campaign.handle || campaign.id || campaign.name;

  const config = campaign.dashboardConfig;
  const hero =
    config && typeof config === 'object'
      ? normalizeHeroFields((config as { hero?: unknown }).hero ?? null)
      : null;

  const overlayStrength = hero?.overlayStrength ?? 0.55;
  const focalX = (hero?.focalPointX ?? 0.5) * 100;
  const focalY = (hero?.focalPointY ?? 0.5) * 100;

  const backdropStyle: CSSProperties = coverUrl
    ? {
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: `${focalX}% ${focalY}%`,
      }
    : gradientStyle;

  const overlayStyle: CSSProperties = {
    background: coverUrl
      ? buildCoverOverlay(overlayStrength, accentRgb)
      : `linear-gradient(135deg, rgba(0,0,0,0.28) 0%, transparent 55%), linear-gradient(to top, rgba(${accentRgb}, 0.14) 0%, transparent 50%)`,
  };

  const cardStyle: CSSProperties = {
    '--card-accent': accentColor,
    '--card-accent-rgb': accentRgb,
    '--hub-art-fg': HUB_ARTWORK_FOREGROUND,
    '--hub-art-fg-muted': HUB_ARTWORK_FOREGROUND_MUTED,
    borderLeftColor: accentColor,
    borderLeftWidth: 3,
  } as CSSProperties;

  const arc = arcIdentity?.currentArc?.trim() || null;
  const candidateTension = truncateTensionLine(arcIdentity?.tensionLine);
  const tension =
    arc && candidateTension && normalizeDisplayText(arc) === normalizeDisplayText(candidateTension)
      ? null
      : candidateTension;

  return {
    coverUrl,
    backdropStyle: coverUrl ? backdropStyle : (gradientStyle ?? buildCampaignGradientStyle(seed)),
    overlayStyle,
    cardStyle,
    accentColor,
    accentRgb,
    arcTitle: arc,
    campaignTitle: campaign.name,
    tensionLine: tension,
    continuityLines: arcIdentity?.continuityBullets ?? [],
  };
}
