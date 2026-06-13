import type {
  HavenIdentityHints,
  HavenReferenceEntry,
  HavenSpaceEntry,
} from '../../../shared/havenMetadata.js';
import { sortHavenReferences, sortHavenSpaces } from '../../../shared/havenMetadata.js';
import { prisma } from './prisma.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { extractWikiPageExcerpt } from './wikiExcerpt.js';

export type HavenReferenceOpensIn = 'wiki' | 'maps' | 'external' | 'chronology';

export type HydratedHavenReference = {
  id: string;
  type: HavenReferenceEntry['type'];
  title: string;
  href: string;
  previewImageUrl: string | null;
  excerpt: string | null;
  opensIn: HavenReferenceOpensIn;
};

export type HydratedHavenIdentity = {
  bannerUrl: string | null;
  portraitUrl: string | null;
  crestUrl: string | null;
  galleryUrls: string[];
  summary: string | null;
  locationLabel: string | null;
  locationHref: string | null;
  factions: Array<{ pageId: string; label: string; href: string }>;
  relatedPages: Array<{ pageId: string; label: string; href: string }>;
};

function assetVariantUrl(assetId: string, variant: 'display' | 'thumb'): string {
  return `/api/assets/${assetId}?variant=${variant}`;
}

function buildMapHref(campaignHandle: string, assetId: string): string {
  return `/campaigns/${campaignHandle}/maps/${assetId}/scene`;
}

function buildChronologyEventHref(campaignHandle: string, eventId: string): string {
  return `/campaigns/${campaignHandle}/chronology?view=feed&event=${encodeURIComponent(eventId)}`;
}

async function loadAssetsById(assetIds: string[]): Promise<
  Map<string, { id: string; type: string }>
> {
  if (assetIds.length === 0) return new Map();
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, type: true },
  });
  return new Map(assets.map((asset) => [asset.id, asset]));
}

async function loadWikiPagesById(
  campaignId: string,
  pageIds: string[],
): Promise<
  Map<
    string,
    {
      id: string;
      title: string;
      templateType: string;
      featuredImageId: string | null;
      mapAssetId: string | null;
      blocks: unknown;
    }
  >
> {
  if (pageIds.length === 0) return new Map();
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: pageIds }, deletedAt: null },
    select: {
      ...wikiPageHrefSelect,
      featuredImageId: true,
      mapAssetId: true,
      blocks: true,
    },
  });
  return new Map(pages.map((page) => [page.id, page]));
}

async function loadCalendarEventsById(
  campaignId: string,
  eventIds: string[],
): Promise<Map<string, { id: string; title: string; description: string | null }>> {
  if (eventIds.length === 0) return new Map();
  const events = await prisma.calendarEvent.findMany({
    where: {
      id: { in: eventIds },
      calendar: { campaignId },
    },
    select: { id: true, title: true, description: true },
  });
  return new Map(events.map((event) => [event.id, event]));
}

export async function hydrateHavenIdentity(input: {
  campaignId: string;
  campaignHandle: string;
  featuredImageId: string | null;
  identityHints: HavenIdentityHints;
  locationPageId: string | null;
  factionPageIds: string[];
  relatedPageIds: string[];
}): Promise<HydratedHavenIdentity> {
  const assetIds = [
    input.featuredImageId,
    input.identityHints.portraitAssetId,
    input.identityHints.crestAssetId,
    ...input.identityHints.galleryAssetIds,
  ].filter((id): id is string => Boolean(id));

  const pageIds = [
    input.locationPageId,
    ...input.factionPageIds,
    ...input.relatedPageIds,
  ].filter((id): id is string => Boolean(id));

  const [assetsById, pagesById] = await Promise.all([
    loadAssetsById(assetIds),
    loadWikiPagesById(input.campaignId, pageIds),
  ]);

  const bannerUrl = input.featuredImageId
    ? assetVariantUrl(input.featuredImageId, 'display')
    : null;
  const portraitUrl = input.identityHints.portraitAssetId
    ? assetVariantUrl(input.identityHints.portraitAssetId, 'display')
    : null;
  const crestUrl = input.identityHints.crestAssetId
    ? assetVariantUrl(input.identityHints.crestAssetId, 'thumb')
    : null;
  const galleryUrls = input.identityHints.galleryAssetIds
    .filter((id) => assetsById.has(id))
    .map((id) => assetVariantUrl(id, 'display'));

  const locationPage = input.locationPageId
    ? pagesById.get(input.locationPageId)
    : null;

  return {
    bannerUrl,
    portraitUrl,
    crestUrl,
    galleryUrls,
    summary: input.identityHints.summary,
    locationLabel: locationPage?.title ?? null,
    locationHref: locationPage
      ? buildWikiPageHref(input.campaignHandle, locationPage)
      : null,
    factions: input.factionPageIds
      .map((pageId) => {
        const page = pagesById.get(pageId);
        if (!page) return null;
        return {
          pageId,
          label: page.title,
          href: buildWikiPageHref(input.campaignHandle, page),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null),
    relatedPages: input.relatedPageIds
      .map((pageId) => {
        const page = pagesById.get(pageId);
        if (!page) return null;
        return {
          pageId,
          label: page.title,
          href: buildWikiPageHref(input.campaignHandle, page),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null),
  };
}

export async function hydrateHavenReferences(input: {
  campaignId: string;
  campaignHandle: string;
  references: HavenReferenceEntry[];
}): Promise<HydratedHavenReference[]> {
  const sorted = sortHavenReferences(input.references);
  if (sorted.length === 0) return [];

  const wikiPageIds: string[] = [];
  const assetIds: string[] = [];
  const calendarEventIds: string[] = [];

  for (const ref of sorted) {
    if (ref.targetType === 'wiki_page' && ref.targetId) wikiPageIds.push(ref.targetId);
    if (ref.targetType === 'asset' && ref.targetId) assetIds.push(ref.targetId);
    if (ref.targetType === 'calendar_event' && ref.targetId) {
      calendarEventIds.push(ref.targetId);
    }
    if (ref.targetType === 'map_pin' && ref.targetId) {
      // map_pin preview resolved separately if needed
    }
  }

  const [pagesById, assetsById, eventsById] = await Promise.all([
    loadWikiPagesById(input.campaignId, wikiPageIds),
    loadAssetsById(assetIds),
    loadCalendarEventsById(input.campaignId, calendarEventIds),
  ]);

  return sorted.map((ref) => {
    if (ref.targetType === 'external' || ref.type === 'external_doc') {
      const href = ref.url ?? '#';
      return {
        id: ref.id,
        type: ref.type,
        title: ref.title,
        href,
        previewImageUrl: null,
        excerpt: null,
        opensIn: 'external' as const,
      };
    }

    if (ref.targetType === 'wiki_page' && ref.targetId) {
      const page = pagesById.get(ref.targetId);
      const href = page
        ? buildWikiPageHref(input.campaignHandle, page)
        : buildWikiPageHref(input.campaignHandle, ref.targetId);
      const mapAssetId = page?.mapAssetId ?? null;
      const opensIn =
        ref.type === 'map' || ref.type === 'vtt_scene'
          ? mapAssetId
            ? ('maps' as const)
            : ('wiki' as const)
          : ('wiki' as const);
      const resolvedHref =
        opensIn === 'maps' && mapAssetId
          ? buildMapHref(input.campaignHandle, mapAssetId)
          : href;
      const previewImageUrl = page?.featuredImageId
        ? assetVariantUrl(page.featuredImageId, 'thumb')
        : mapAssetId
          ? assetVariantUrl(mapAssetId, 'thumb')
          : null;
      return {
        id: ref.id,
        type: ref.type,
        title: ref.title,
        href: resolvedHref,
        previewImageUrl,
        excerpt: page
          ? extractWikiPageExcerpt(page.blocks, { includeDmOnlyBlocks: false })
          : null,
        opensIn,
      };
    }

    if (ref.targetType === 'asset' && ref.targetId) {
      const asset = assetsById.get(ref.targetId);
      const opensIn =
        ref.type === 'map' || ref.type === 'vtt_scene' ? ('maps' as const) : ('wiki' as const);
      return {
        id: ref.id,
        type: ref.type,
        title: ref.title,
        href:
          opensIn === 'maps'
            ? buildMapHref(input.campaignHandle, ref.targetId)
            : assetVariantUrl(ref.targetId, 'display'),
        previewImageUrl: asset ? assetVariantUrl(asset.id, 'thumb') : null,
        excerpt: null,
        opensIn,
      };
    }

    if (ref.targetType === 'calendar_event' && ref.targetId) {
      const event = eventsById.get(ref.targetId);
      return {
        id: ref.id,
        type: ref.type,
        title: ref.title,
        href: buildChronologyEventHref(input.campaignHandle, ref.targetId),
        previewImageUrl: null,
        excerpt: event?.description ?? event?.title ?? null,
        opensIn: 'chronology' as const,
      };
    }

    if (ref.url) {
      return {
        id: ref.id,
        type: ref.type,
        title: ref.title,
        href: ref.url,
        previewImageUrl: null,
        excerpt: null,
        opensIn: 'external' as const,
      };
    }

    return {
      id: ref.id,
      type: ref.type,
      title: ref.title,
      href: '#',
      previewImageUrl: null,
      excerpt: null,
      opensIn: 'wiki' as const,
    };
  });
}

export function hydrateHavenSpaces(spaces: HavenSpaceEntry[]): Array<{
  id: string;
  label: string;
  description: string | null;
}> {
  return sortHavenSpaces(spaces).map((space) => ({
    id: space.id,
    label: space.label,
    description: space.description,
  }));
}
