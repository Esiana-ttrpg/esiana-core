import { prisma } from './prisma.js';
import {
  isElevatedMapRole,
  isPinVisibleToRole,
  type MapPinVisibilityContext,
} from './mapPinVisibility.js';
import { extractWikiPageExcerpt } from './wikiExcerpt.js';
import type { CampaignMemberRole } from '../types/domain.js';

const mapPinPreviewInclude = {
  targetPage: {
    select: { id: true, title: true, visibility: true, blocks: true },
  },
  targetAsset: {
    select: {
      id: true,
      type: true,
      displayName: true,
      visibility: true,
      interactiveMapPages: {
        select: { id: true, title: true, visibility: true },
        take: 1,
      },
    },
  },
} as const;

export type MapPinPreviewPayload = {
  title: string;
  excerpt: string;
  visibility: string;
  wikiPageId: string;
  targetAssetId: string | null;
  thumbnailUrl: string | null;
};

type LoadedPin = MapPinVisibilityContext & {
  targetPage: {
    id: string;
    title: string;
    visibility: string;
    blocks: unknown;
  } | null;
  targetAsset: {
    id: string;
    type: string;
    displayName: string | null;
    visibility: string;
    interactiveMapPages: { id: string; title: string; visibility: string }[];
  } | null;
};

/** Resolve a MapPin row from pin id or linked scene object id. */
export async function loadMapPinForPreview(
  campaignId: string,
  pinOrSceneObjectId: string,
): Promise<LoadedPin | null> {
  const byPinId = await prisma.mapPin.findFirst({
    where: {
      id: pinOrSceneObjectId,
      asset: { campaignId },
    },
    include: mapPinPreviewInclude,
  });
  if (byPinId) return byPinId;

  const sceneObject = await prisma.mapSceneObject.findFirst({
    where: {
      id: pinOrSceneObjectId,
      campaignId,
      mapPinId: { not: null },
    },
    select: { mapPinId: true },
  });
  if (!sceneObject?.mapPinId) return null;

  return prisma.mapPin.findFirst({
    where: {
      id: sceneObject.mapPinId,
      asset: { campaignId },
    },
    include: mapPinPreviewInclude,
  });
}

export function buildMapPinPreviewPayload(
  pin: LoadedPin,
  role: CampaignMemberRole | null,
): MapPinPreviewPayload | null {
  if (!isPinVisibleToRole(pin, role)) return null;

  const page = pin.targetPage;
  if (!page && pin.targetAsset) {
    const host = pin.targetAsset.interactiveMapPages[0];
    const nestedTitle =
      pin.targetAsset.displayName?.trim() || host?.title || 'Nested map';
    return {
      title: nestedTitle,
      excerpt: '',
      visibility: host?.visibility ?? pin.targetAsset.visibility ?? 'Party',
      wikiPageId: host?.id ?? '',
      targetAssetId: pin.targetAssetId,
      thumbnailUrl: null,
    };
  }

  if (!page) return null;

  return {
    title: page.title,
    excerpt: extractWikiPageExcerpt(page.blocks, {
      includeDmOnlyBlocks: isElevatedMapRole(role),
    }),
    visibility: page.visibility,
    wikiPageId: page.id,
    targetAssetId: pin.targetAssetId,
    thumbnailUrl: null,
  };
}
