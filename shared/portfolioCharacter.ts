/**
 * Character Portfolio domain types, filter derivation, and public projection.
 *
 * Portfolio characters are user-owned identity records.
 * Campaign characters remain campaign-scoped WikiPages.
 * PortfolioCharacterAdventure links them by provenance only — never sync.
 */

export const PORTFOLIO_ADVENTURE_STATUSES = ['CURRENT', 'PAST', 'DETACHED'] as const;
export type PortfolioAdventureStatus = (typeof PORTFOLIO_ADVENTURE_STATUSES)[number];

export const PORTFOLIO_ADVENTURE_DIRECTIONS = ['TO_CAMPAIGN', 'FROM_CAMPAIGN'] as const;
export type PortfolioAdventureDirection = (typeof PORTFOLIO_ADVENTURE_DIRECTIONS)[number];

export const PORTFOLIO_MEDIA_KINDS = ['PORTRAIT', 'GALLERY'] as const;
export type PortfolioMediaKind = (typeof PORTFOLIO_MEDIA_KINDS)[number];

/** Derived, mutually exclusive portfolio list filters. */
export const PORTFOLIO_DERIVED_FILTERS = ['ACTIVE', 'PAST', 'UNASSIGNED'] as const;
export type PortfolioDerivedFilter = (typeof PORTFOLIO_DERIVED_FILTERS)[number];

export type PortfolioAdventureSnapshot = {
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
};

export type PortfolioAdventureStatusInput = {
  status: string;
};

/**
 * Mutually exclusive derived filter:
 * - ACTIVE: ≥1 CURRENT adventure
 * - PAST: no CURRENT, but ≥1 historical (PAST/DETACHED)
 * - UNASSIGNED: never had a campaign incarnation (zero adventures)
 *
 * Staleness alone must never produce PAST.
 */
export function derivePortfolioFilter(
  adventures: readonly PortfolioAdventureStatusInput[],
): PortfolioDerivedFilter {
  if (adventures.length === 0) return 'UNASSIGNED';
  const hasCurrent = adventures.some((a) => a.status === 'CURRENT');
  if (hasCurrent) return 'ACTIVE';
  return 'PAST';
}

export function emptyAdventureSnapshot(
  partial?: Partial<PortfolioAdventureSnapshot>,
): PortfolioAdventureSnapshot {
  return {
    campaignTitle: partial?.campaignTitle ?? '',
    campaignHandle: partial?.campaignHandle ?? null,
    roleLabel: partial?.roleLabel ?? null,
    levelStart: partial?.levelStart ?? null,
    levelEnd: partial?.levelEnd ?? null,
    startedAt: partial?.startedAt ?? null,
    endedAt: partial?.endedAt ?? null,
    sessionCount: partial?.sessionCount ?? null,
    oneShot: partial?.oneShot ?? false,
    visibilityHint: partial?.visibilityHint ?? null,
  };
}

export function parseAdventureSnapshot(raw: unknown): PortfolioAdventureSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyAdventureSnapshot();
  }
  const o = raw as Record<string, unknown>;
  return emptyAdventureSnapshot({
    campaignTitle: typeof o.campaignTitle === 'string' ? o.campaignTitle : '',
    campaignHandle: typeof o.campaignHandle === 'string' ? o.campaignHandle : null,
    roleLabel: typeof o.roleLabel === 'string' ? o.roleLabel : null,
    levelStart: typeof o.levelStart === 'string' ? o.levelStart : null,
    levelEnd: typeof o.levelEnd === 'string' ? o.levelEnd : null,
    startedAt: typeof o.startedAt === 'string' ? o.startedAt : null,
    endedAt: typeof o.endedAt === 'string' ? o.endedAt : null,
    sessionCount:
      typeof o.sessionCount === 'number' && Number.isFinite(o.sessionCount)
        ? o.sessionCount
        : null,
    oneShot: o.oneShot === true,
    visibilityHint: typeof o.visibilityHint === 'string' ? o.visibilityHint : null,
  });
}

/** Fields allowed on the public profile / public character page. */
export type PublicPortfolioCharacterProjection = {
  id: string;
  name: string;
  tagline: string | null;
  roleLabel: string | null;
  levelLabel: string | null;
  pronouns: string | null;
  ancestry: string | null;
  appearanceSummary: string | null;
  biographyExcerpt: string | null;
  portraitUrl: string | null;
  adventureBlurb: PublicAdventureBlurb | null;
  ownerUserId: string;
};

export type PublicAdventureBlurb = {
  /** Campaign title only when linkable to the viewer; otherwise null. */
  campaignTitle: string | null;
  campaignHandle: string | null;
  /** True when a CURRENT adventure exists. */
  currentlyAdventuring: boolean;
  /** Generic label when campaign title must be omitted. */
  genericLabel: string | null;
};

export type PublicProjectionSource = {
  id: string;
  userId: string;
  name: string;
  tagline: string | null;
  roleLabel: string | null;
  levelLabel: string | null;
  biography: string;
  isShowcased: boolean;
  metadata: unknown;
  portraitUrl: string | null;
  currentAdventure: {
    snapshot: PortfolioAdventureSnapshot;
    /** Whether the viewer may see this campaign's name/handle. */
    campaignLinkable: boolean;
  } | null;
};

const BIO_EXCERPT_MAX = 280;

function excerptBio(biography: string): string | null {
  const trimmed = biography.trim();
  if (!trimmed) return null;
  if (trimmed.length <= BIO_EXCERPT_MAX) return trimmed;
  return `${trimmed.slice(0, BIO_EXCERPT_MAX - 1).trimEnd()}…`;
}

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const root = metadata as Record<string, unknown>;
  if (typeof root[key] === 'string' && root[key].trim()) return (root[key] as string).trim();
  const appearance = root.appearance;
  if (appearance && typeof appearance === 'object' && !Array.isArray(appearance)) {
    const a = appearance as Record<string, unknown>;
    if (typeof a[key] === 'string' && a[key].trim()) return (a[key] as string).trim();
  }
  return null;
}

/**
 * Build the allowlisted public projection.
 * Returns null if the character is not showcased (callers may still return for owner).
 */
export function buildPublicPortfolioProjection(
  source: PublicProjectionSource,
  options?: { requireShowcased?: boolean },
): PublicPortfolioCharacterProjection | null {
  const requireShowcased = options?.requireShowcased !== false;
  if (requireShowcased && !source.isShowcased) return null;

  let adventureBlurb: PublicAdventureBlurb | null = null;
  if (source.currentAdventure) {
    const { snapshot, campaignLinkable } = source.currentAdventure;
    if (campaignLinkable && snapshot.campaignTitle) {
      adventureBlurb = {
        campaignTitle: snapshot.campaignTitle,
        campaignHandle: snapshot.campaignHandle,
        currentlyAdventuring: true,
        genericLabel: null,
      };
    } else {
      adventureBlurb = {
        campaignTitle: null,
        campaignHandle: null,
        currentlyAdventuring: true,
        genericLabel: 'Currently adventuring',
      };
    }
  }

  return {
    id: source.id,
    name: source.name,
    tagline: source.tagline,
    roleLabel: source.roleLabel,
    levelLabel: source.levelLabel,
    pronouns: readMetadataString(source.metadata, 'pronouns'),
    ancestry: readMetadataString(source.metadata, 'ancestry'),
    appearanceSummary: readMetadataString(source.metadata, 'summary'),
    biographyExcerpt: excerptBio(source.biography),
    portraitUrl: source.portraitUrl,
    adventureBlurb,
    ownerUserId: source.userId,
  };
}

export function isPortfolioAdventureStatus(value: string): value is PortfolioAdventureStatus {
  return (PORTFOLIO_ADVENTURE_STATUSES as readonly string[]).includes(value);
}

export function isPortfolioMediaKind(value: string): value is PortfolioMediaKind {
  return (PORTFOLIO_MEDIA_KINDS as readonly string[]).includes(value);
}
