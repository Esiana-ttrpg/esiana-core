import type { Prisma } from '../../generated/prisma/client.js';
import {
  derivePortfolioFilter,
  emptyAdventureSnapshot,
  parseAdventureSnapshot,
  type PortfolioAdventureSnapshot,
  type PortfolioDerivedFilter,
} from '../../../../shared/portfolioCharacter.js';

/** Strip campaign-scoped IDs from character metadata for portfolio storage. */
export function toPortfolioMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const src = { ...(raw as Record<string, unknown>) };
  delete src.entityCategory;
  delete src.primaryAffiliationId;
  delete src.ancestryId;
  delete src.lineageId;
  delete src.currentLocationId;
  delete src.locationRelations;
  delete src.partyParticipation;
  delete src.dmSecrets;
  delete src.familyId;
  delete src.parentLinks;
  delete src.spouseLinks;
  delete src.orgAffiliations;
  delete src.socialLinks;
  // Keep appearance but drop portraitUrl if we use UserAsset separately (caller may set).
  return src;
}

export function normalizeNullableText(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export type AdventureRowLike = {
  id: string;
  status: string;
  direction: string;
  campaignId: string;
  campaignCharacterPageId: string | null;
  snapshot: unknown;
  linkedAt: Date;
  unlinkedAt: Date | null;
  campaign?: { id: string; name: string; handle: string; archivedAt: Date | null } | null;
};

export type MediaRowLike = {
  id: string;
  kind: string;
  caption: string | null;
  sortOrder: number;
  occurredAt: Date | null;
  adventureId: string | null;
  userAsset: {
    id: string;
    url: string;
    displayUrl: string | null;
    thumbnailUrl: string | null;
    displayName: string | null;
  };
};

export type PortfolioCharacterRow = {
  id: string;
  userId: string;
  name: string;
  biography: string;
  metadata: unknown;
  tagline: string | null;
  roleLabel: string | null;
  levelLabel: string | null;
  favoritedAt: Date | null;
  archivedAt: Date | null;
  isShowcased: boolean;
  showcaseOrder: number | null;
  portraitMediaId: string | null;
  createdAt: Date;
  updatedAt: Date;
  adventures?: AdventureRowLike[];
  media?: MediaRowLike[];
  portraitMedia?: MediaRowLike | null;
};

export function resolvePortraitUrl(row: PortfolioCharacterRow): string | null {
  if (row.portraitMedia?.userAsset?.url) return row.portraitMedia.userAsset.url;
  const portrait = (row.media ?? []).find((m) => m.kind === 'PORTRAIT');
  if (portrait?.userAsset?.url) return portrait.userAsset.url;
  const meta = row.metadata;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const appearance = (meta as Record<string, unknown>).appearance;
    if (appearance && typeof appearance === 'object' && !Array.isArray(appearance)) {
      const url = (appearance as Record<string, unknown>).portraitUrl;
      if (typeof url === 'string' && url.trim()) return url.trim();
    }
  }
  return null;
}

export function serializeAdventure(row: AdventureRowLike) {
  const snapshot = parseAdventureSnapshot(row.snapshot);
  if (row.campaign && !snapshot.campaignTitle) {
    snapshot.campaignTitle = row.campaign.name;
    snapshot.campaignHandle = row.campaign.handle;
  }
  return {
    id: row.id,
    status: row.status,
    direction: row.direction,
    campaignId: row.campaignId,
    campaignCharacterPageId: row.campaignCharacterPageId,
    snapshot,
    linkedAt: row.linkedAt.toISOString(),
    unlinkedAt: row.unlinkedAt?.toISOString() ?? null,
  };
}

export function serializeMedia(row: MediaRowLike) {
  return {
    id: row.id,
    kind: row.kind,
    caption: row.caption,
    sortOrder: row.sortOrder,
    occurredAt: row.occurredAt?.toISOString() ?? null,
    adventureId: row.adventureId,
    url: row.userAsset.url,
    displayUrl: row.userAsset.displayUrl ?? row.userAsset.url,
    thumbnailUrl: row.userAsset.thumbnailUrl ?? row.userAsset.url,
    assetId: row.userAsset.id,
    displayName: row.userAsset.displayName,
  };
}

export function serializePortfolioCharacter(
  row: PortfolioCharacterRow,
  options?: { includeArchivedFlag?: boolean },
) {
  const adventures = row.adventures ?? [];
  const derivedFilter: PortfolioDerivedFilter = derivePortfolioFilter(adventures);
  const portraitUrl = resolvePortraitUrl(row);
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    biography: row.biography,
    metadata: (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<
      string,
      unknown
    >,
    tagline: row.tagline,
    roleLabel: row.roleLabel,
    levelLabel: row.levelLabel,
    favoritedAt: row.favoritedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    isShowcased: row.isShowcased,
    showcaseOrder: row.showcaseOrder,
    portraitMediaId: row.portraitMediaId,
    portraitUrl,
    derivedFilter,
    isFavorite: row.favoritedAt != null,
    isArchived: row.archivedAt != null,
    adventures: adventures.map(serializeAdventure),
    media: (row.media ?? []).map(serializeMedia),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(options?.includeArchivedFlag ? {} : {}),
  };
}

export type SerializedPortfolioCharacter = ReturnType<typeof serializePortfolioCharacter>;

export function buildAdventureSnapshot(input: {
  campaignTitle: string;
  campaignHandle?: string | null;
  roleLabel?: string | null;
  levelStart?: string | null;
  levelEnd?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  sessionCount?: number | null;
  oneShot?: boolean;
}): PortfolioAdventureSnapshot {
  return emptyAdventureSnapshot({
    campaignTitle: input.campaignTitle,
    campaignHandle: input.campaignHandle ?? null,
    roleLabel: input.roleLabel ?? null,
    levelStart: input.levelStart ?? null,
    levelEnd: input.levelEnd ?? null,
    startedAt: input.startedAt ?? null,
    endedAt: input.endedAt ?? null,
    sessionCount: input.sessionCount ?? null,
    oneShot: input.oneShot ?? false,
  });
}

export const portfolioCharacterInclude = {
  adventures: {
    include: {
      campaign: {
        select: { id: true, name: true, handle: true, archivedAt: true },
      },
    },
    orderBy: [{ status: 'asc' as const }, { linkedAt: 'desc' as const }],
  },
  media: {
    include: {
      userAsset: {
        select: {
          id: true,
          url: true,
          displayUrl: true,
          thumbnailUrl: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ kind: 'asc' as const }, { sortOrder: 'asc' as const }],
  },
  portraitMedia: {
    include: {
      userAsset: {
        select: {
          id: true,
          url: true,
          displayUrl: true,
          thumbnailUrl: true,
          displayName: true,
        },
      },
    },
  },
} satisfies Prisma.PortfolioCharacterInclude;
