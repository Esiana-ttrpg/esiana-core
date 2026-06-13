import { prisma } from './prisma.js';
import { isPackAssetRef, resolvePackAssetRef } from './pageMetadataRoundTrip.js';

export interface PackRelationLink {
  sourcePageId?: string;
  targetPageId?: string;
  sourceSlug?: string;
  targetSlug?: string;
}

export interface PackRelationTag {
  pageId?: string;
  pageSlug?: string;
  tagName: string;
  tagLabel: string;
  tagIcon?: string;
  tagColor?: string;
}

export interface PackRelationMapPin {
  id: string;
  assetId?: string;
  assetPath?: string;
  targetPageId?: string;
  targetSlug?: string;
  targetAssetId?: string;
  label?: string;
  pinType?: string;
  x_coordinate: number;
  y_coordinate: number;
}

export interface PackRelations {
  links: PackRelationLink[];
  tags: PackRelationTag[];
  mapPins: PackRelationMapPin[];
}

export function parsePackRelations(raw: unknown): PackRelations | null {
  if (!raw || typeof raw !== 'object') return null;
  const relations = raw as PackRelations;
  if (!Array.isArray(relations.links) || !Array.isArray(relations.tags)) {
    return null;
  }
  return {
    links: relations.links,
    tags: relations.tags,
    mapPins: Array.isArray(relations.mapPins) ? relations.mapPins : [],
  };
}

export function resolvePackRelationsIds(
  relations: PackRelations,
  slugToPageId: Map<string, string>,
  assetPathToId: Map<string, string>,
): PackRelations {
  return {
    links: relations.links.map((link) => ({
      sourcePageId:
        link.sourcePageId ??
        (link.sourceSlug ? slugToPageId.get(link.sourceSlug) : undefined) ??
        '',
      targetPageId:
        link.targetPageId ??
        (link.targetSlug ? slugToPageId.get(link.targetSlug) : undefined) ??
        '',
    })),
    tags: relations.tags.map((tag) => ({
      pageId:
        tag.pageId ??
        (tag.pageSlug ? slugToPageId.get(tag.pageSlug) : undefined) ??
        '',
      tagName: tag.tagName,
      tagLabel: tag.tagLabel,
      tagIcon: tag.tagIcon,
      tagColor: tag.tagColor,
    })),
    mapPins: relations.mapPins.map((pin) => {
      let assetId = pin.assetId ?? '';
      if (!assetId && pin.assetPath) {
        assetId =
          resolvePackAssetRef(
            pin.assetPath.startsWith('asset:') ? pin.assetPath : `asset:${pin.assetPath}`,
            assetPathToId,
          ) ?? '';
      }
      return {
        ...pin,
        assetId,
        targetPageId:
          pin.targetPageId ??
          (pin.targetSlug ? slugToPageId.get(pin.targetSlug) : undefined),
      };
    }),
  };
}

export async function applyPackRelations(
  campaignId: string,
  relations: PackRelations,
): Promise<void> {
  for (const link of relations.links) {
    if (!link.sourcePageId || !link.targetPageId) continue;
    await prisma.wikiLink.upsert({
      where: {
        sourcePageId_targetPageId: {
          sourcePageId: link.sourcePageId,
          targetPageId: link.targetPageId,
        },
      },
      create: {
        campaignId,
        sourcePageId: link.sourcePageId,
        targetPageId: link.targetPageId,
      },
      update: {},
    });
  }

  for (const pin of relations.mapPins) {
    if (!pin.assetId || (!pin.targetPageId && !pin.targetAssetId)) continue;
    await prisma.mapPin.upsert({
      where: { id: pin.id },
      create: {
        id: pin.id,
        assetId: pin.assetId,
        targetPageId: pin.targetPageId,
        targetAssetId: pin.targetAssetId,
        label: pin.label,
        pinType: pin.pinType ?? 'Location',
        x_coordinate: pin.x_coordinate,
        y_coordinate: pin.y_coordinate,
      },
      update: {
        assetId: pin.assetId,
        targetPageId: pin.targetPageId,
        targetAssetId: pin.targetAssetId,
        label: pin.label,
        pinType: pin.pinType ?? 'Location',
        x_coordinate: pin.x_coordinate,
        y_coordinate: pin.y_coordinate,
      },
    });
  }

  const tagMetaByName = new Map<
    string,
    { label: string; icon: string | null; color: string | null }
  >();
  for (const tagEntry of relations.tags) {
    if (!tagMetaByName.has(tagEntry.tagName)) {
      tagMetaByName.set(tagEntry.tagName, {
        label: tagEntry.tagLabel,
        icon: typeof tagEntry.tagIcon === 'string' ? tagEntry.tagIcon : null,
        color: typeof tagEntry.tagColor === 'string' ? tagEntry.tagColor : null,
      });
    }
  }

  for (const [tagName, meta] of tagMetaByName) {
    const tag = await prisma.tag.upsert({
      where: {
        campaignId_name: {
          campaignId,
          name: tagName,
        },
      },
      create: {
        campaignId,
        name: tagName,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
      },
      update: {
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
      },
    });

    const pageIds = relations.tags
      .filter((entry) => entry.tagName === tagName)
      .map((entry) => entry.pageId)
      .filter(Boolean) as string[];

    if (pageIds.length > 0) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: {
          pages: {
            connect: pageIds.map((pageId) => ({ id: pageId })),
          },
        },
      });
    }
  }
}
