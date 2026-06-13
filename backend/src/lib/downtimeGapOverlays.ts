import {
  mergeDowntimeAnnotations,
  mergeDowntimeLocationMentions,
  parseDowntimeGapOverlay,
  parseDowntimeGapOverlayMap,
  type DowntimeGapOverlay,
  type DowntimeGapOverlayMap,
} from '../../../shared/downtimeAnnotations.js';
import { prisma } from './prisma.js';

export { parseDowntimeGapOverlayMap, type DowntimeGapOverlay, type DowntimeGapOverlayMap };

export async function loadDowntimeGapOverlays(
  campaignId: string,
): Promise<DowntimeGapOverlayMap> {
  const row = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { downtimeGapOverlays: true },
  });
  return parseDowntimeGapOverlayMap(row?.downtimeGapOverlays);
}

export async function upsertDowntimeGapOverlay(
  campaignId: string,
  overlay: DowntimeGapOverlay,
): Promise<DowntimeGapOverlay> {
  const parsed = parseDowntimeGapOverlay(overlay);
  if (!parsed) {
    throw new Error('Invalid downtime gap overlay');
  }

  const existing = await loadDowntimeGapOverlays(campaignId);
  const prior = existing[parsed.gapId];
  const merged: DowntimeGapOverlay = {
    gapId: parsed.gapId,
    promotedLabel:
      parsed.promotedLabel?.trim() || prior?.promotedLabel?.trim() || null,
    annotations: mergeDowntimeAnnotations(
      prior?.annotations ?? [],
      parsed.annotations ?? [],
    ),
    locationMentions: mergeDowntimeLocationMentions(
      prior?.locationMentions ?? [],
      parsed.locationMentions ?? [],
    ),
  };
  const next: DowntimeGapOverlayMap = {
    ...existing,
    [parsed.gapId]: merged,
  };

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { downtimeGapOverlays: next as never },
  });

  return merged;
}
