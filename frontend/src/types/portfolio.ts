import type { PublicPortfolioCharacterProjection } from '@shared/portfolioCharacter';

export type PortfolioDerivedFilter = 'ACTIVE' | 'PAST' | 'UNASSIGNED';

export interface PortfolioAdventureSnapshot {
  campaignTitle: string;
  campaignHandle: string | null;
  roleLabel: string | null;
  levelStart: string | null;
  levelEnd: string | null;
  startedAt: string | null;
  endedAt: string | null;
  sessionCount: number | null;
  oneShot: boolean;
  visibilityHint: string | null;
}

export interface PortfolioAdventure {
  id: string;
  status: string;
  direction: string;
  campaignId: string | null;
  campaignCharacterPageId: string | null;
  snapshot: PortfolioAdventureSnapshot;
  linkedAt: string;
  unlinkedAt: string | null;
}

export interface PortfolioMedia {
  id: string;
  kind: string;
  caption: string | null;
  sortOrder: number;
  occurredAt: string | null;
  adventureId: string | null;
  url: string;
  displayUrl: string;
  thumbnailUrl: string;
  assetId: string;
  displayName: string | null;
}

export interface PortfolioCharacter {
  id: string;
  userId: string;
  name: string;
  biography: string;
  metadata: Record<string, unknown>;
  tagline: string | null;
  roleLabel: string | null;
  levelLabel: string | null;
  favoritedAt: string | null;
  archivedAt: string | null;
  isShowcased: boolean;
  showcaseOrder: number | null;
  portraitMediaId: string | null;
  portraitUrl: string | null;
  derivedFilter: PortfolioDerivedFilter;
  isFavorite: boolean;
  isArchived: boolean;
  adventures: PortfolioAdventure[];
  media: PortfolioMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioListCounts {
  all: number;
  active: number;
  past: number;
  unassigned: number;
}

export interface PortfolioListResponse {
  characters: PortfolioCharacter[];
  counts: PortfolioListCounts;
}

export type { PublicPortfolioCharacterProjection };

type PublicAdventure = {
  id: string;
  status: string;
  campaignTitle: string | null;
  campaignHandle: string | null;
  roleLabel: string | null;
  levelStart: string | null;
  levelEnd: string | null;
  startedAt: string | null;
  endedAt: string | null;
  sessionCount: number | null;
  oneShot: boolean;
  genericLabel: string | null;
};

type PublicMedia = {
  id: string;
  kind: string;
  caption: string | null;
  sortOrder: number;
  url: string;
  thumbnailUrl: string;
};

/** Public showcase payload. */
export type PublicPortfolioCharacterPagePublic = {
  public: true;
  character: PublicPortfolioCharacterProjection;
  biography: string;
  adventures: PublicAdventure[];
  media: PublicMedia[];
};

/** Owner-only management payload when the character is not showcased. */
export type PublicPortfolioCharacterPageOwnerOnly = {
  public: false;
  character: PortfolioCharacter;
  biography: string;
  adventures: PublicAdventure[];
  media: PublicMedia[];
};

export type PublicPortfolioCharacterPage =
  | PublicPortfolioCharacterPagePublic
  | PublicPortfolioCharacterPageOwnerOnly;
