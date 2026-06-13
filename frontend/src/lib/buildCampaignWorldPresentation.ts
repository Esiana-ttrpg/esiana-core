import type { CSSProperties } from 'react';
import type { CampaignSummary } from '@/types/campaign';
import type { HubArcIdentity } from '@/types/hub';
import {
  buildCampaignBannerStyle,
  buildCampaignGradientStyle,
} from '@/lib/campaignCardPresentation';
import { normalizeHeroFields } from '@/lib/dashboardHeroPresentation';
import { resolveCampaignAccentColor } from '@/lib/hubAmbientTheme';
import { truncateTensionLine } from '@/lib/truncateNarrativeText';

export interface CampaignWorldPresentation {
  coverUrl: string | null;
  backdropStyle: CSSProperties;
  overlayStyle: CSSProperties;
  accentColor: string;
  arcTitle: string | null;
  campaignTitle: string;
  tensionLine: string | null;
  continuityLines: string[];
}

export function buildCampaignWorldPresentation(
  campaign: CampaignSummary,
  arcIdentity?: HubArcIdentity | null,
): CampaignWorldPresentation {
  const { coverUrl, gradientStyle } = buildCampaignBannerStyle(campaign);
  const accentColor = resolveCampaignAccentColor(campaign);
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
      ? `linear-gradient(to top, rgba(0,0,0,${0.75 + overlayStrength * 0.15}) 0%, rgba(0,0,0,${overlayStrength * 0.5}) 50%, rgba(0,0,0,${overlayStrength * 0.35}) 100%)`
      : `linear-gradient(135deg, rgba(0,0,0,0.35) 0%, transparent 60%)`,
    borderLeft: `3px solid ${accentColor}`,
  };

  const arc = arcIdentity?.currentArc?.trim() || null;
  const tension = truncateTensionLine(arcIdentity?.tensionLine);

  return {
    coverUrl,
    backdropStyle: coverUrl ? backdropStyle : (gradientStyle ?? buildCampaignGradientStyle(seed)),
    overlayStyle,
    accentColor,
    arcTitle: arc,
    campaignTitle: campaign.name,
    tensionLine: tension,
    continuityLines: arcIdentity?.continuityBullets ?? [],
  };
}
