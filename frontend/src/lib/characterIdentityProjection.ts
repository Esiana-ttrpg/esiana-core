import {
  formatCharacterStatusLabel,
  isCharacterWikiPage,
  parseCharacterMetadata,
  resolveCharacterStatus,
  resolvePrimaryAffiliationId,
  type CharacterLifeStatus,
} from './characterMetadata';
import { formatPartyParticipationChip } from '@shared/partyParticipation';
import {
  isCharacterAliveAt,
  parseCharacterLineageMetadata,
} from './characterLineageMetadata';
import type { ChronologyDateParts } from './entityRelationTypes';
import type { WikiPageLineageSnapshot } from './entityProjectionQueries';

function formatYearShort(parts: ChronologyDateParts | null): string {
  if (!parts || parts.year === null) return '—';
  return `Y${parts.year}`;
}

function formatBornLabel(birthDate: ChronologyDateParts | null): string {
  return `Born: ${formatYearShort(birthDate)}`;
}

function formatDiedLabel(deathDate: ChronologyDateParts | null): string {
  return `Died: ${formatYearShort(deathDate)}`;
}

function formatActiveRangeLabel(
  start: ChronologyDateParts | null,
  end: ChronologyDateParts | null,
): string {
  const startLabel = formatYearShort(start);
  const endLabel = end ? formatYearShort(end) : 'present';
  return `Active: ${startLabel}–${endLabel}`;
}

export interface IdentitySegment {
  key: string;
  label: string;
}

export interface ComposedIdentityLine {
  visibleLine: string;
  overflowSegments: string[];
}

export function composeIdentityLine(
  segments: IdentitySegment[],
  maxVisible = 4,
): ComposedIdentityLine {
  const nonEmpty = segments.filter((s) => s.label.trim().length > 0);
  const visible = nonEmpty.slice(0, maxVisible);
  const overflow = nonEmpty.slice(maxVisible).map((s) => s.label);
  return {
    visibleLine: visible.map((s) => s.label).join(' • '),
    overflowSegments: overflow,
  };
}

export interface CharacterIdentityProjection {
  displayName: string;
  pronouns: string | null;
  /** Profession-first subtitle for the hero strip (e.g. "Scout merchant"). */
  roleSubtitle: string | null;
  identityLine: string;
  overflowSegments: string[];
  knownFor: string | null;
  activeArc: string | null;
  motivation: string | null;
  status: CharacterLifeStatus;
  statusLabel: string;
  affiliationTitle: string | null;
  affiliationId: string | null;
  familyTitle: string | null;
  familyId: string | null;
  ancestry: string | null;
  ancestryId: string | null;
  lineageId: string | null;
  ancestryLabel: string | null;
  locationLabel: string | null;
  locationId: string | null;
  appearanceSummary: string | null;
  appearanceTags: string[];
  portraitUrl: string | null;
  temporalBadges: Array<{ variant: string; label: string }>;
  lifeStatusVariant: CharacterLifeStatus;
  partyParticipationChip: string | null;
}

function findPage(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): WikiPageLineageSnapshot | null {
  return flatPages.find((page) => page.id === pageId) ?? null;
}

function resolveTitle(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string | null | undefined,
): string | null {
  if (!pageId) return null;
  return findPage(flatPages, pageId)?.title ?? null;
}

function buildTemporalBadges(
  lineage: ReturnType<typeof parseCharacterLineageMetadata>,
  campaignNow: ChronologyDateParts,
): Array<{ variant: string; label: string }> {
  const badges: Array<{ variant: string; label: string }> = [];
  if (lineage.birthDate) {
    badges.push({ variant: 'born', label: formatBornLabel(lineage.birthDate) });
  }
  if (lineage.deathDate) {
    badges.push({ variant: 'died', label: formatDiedLabel(lineage.deathDate) });
  } else if (isCharacterAliveAt(lineage, campaignNow)) {
    badges.push({
      variant: 'active-range',
      label: formatActiveRangeLabel(lineage.birthDate, null),
    });
  }
  return badges;
}

function resolveAncestryLabel(
  flatPages: readonly WikiPageLineageSnapshot[],
  identity: ReturnType<typeof parseCharacterMetadata>,
): string | null {
  if (identity.lineageId) {
    const lineageTitle = resolveTitle(flatPages, identity.lineageId);
    const ancestryTitle = resolveTitle(flatPages, identity.ancestryId);
    if (lineageTitle && ancestryTitle) {
      return `${lineageTitle} · ${ancestryTitle}`;
    }
    return lineageTitle ?? ancestryTitle;
  }
  if (identity.ancestryId) {
    return resolveTitle(flatPages, identity.ancestryId);
  }
  return identity.ancestry?.trim() || null;
}

export function buildCharacterIdentityProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  campaignNow: ChronologyDateParts,
): CharacterIdentityProjection | null {
  const page = findPage(flatPages, pageId);
  if (!page || !isCharacterWikiPage(page)) return null;

  const identity = parseCharacterMetadata(page.metadata);
  const lineage = parseCharacterLineageMetadata(page.metadata);

  const affiliationId = resolvePrimaryAffiliationId(identity, lineage, campaignNow);
  const affiliationTitle = resolveTitle(flatPages, affiliationId);
  const familyTitle = resolveTitle(flatPages, lineage.familyId);
  const locationLabel = resolveTitle(flatPages, identity.currentLocationId);

  const status = resolveCharacterStatus(identity, lineage, campaignNow);
  const statusLabel = formatCharacterStatusLabel(status);

  const roleSubtitle = identity.profession?.trim() || identity.title?.trim() || null;
  const ancestryLabel = resolveAncestryLabel(flatPages, identity);
  const familyOrAncestry = lineage.familyId
    ? (familyTitle ?? '')
    : (ancestryLabel ?? '');

  const { visibleLine, overflowSegments } = composeIdentityLine(
    [
      { key: 'affiliation', label: affiliationTitle ?? '' },
      { key: 'familyOrAncestry', label: familyOrAncestry },
      { key: 'status', label: statusLabel },
    ],
    4,
  );

  return {
    displayName: page.title,
    pronouns: identity.appearance.pronouns,
    roleSubtitle,
    identityLine: visibleLine,
    overflowSegments,
    knownFor: identity.knownFor,
    activeArc: identity.activeArc,
    motivation: identity.motivation,
    status,
    statusLabel,
    affiliationTitle,
    affiliationId,
    familyTitle,
    familyId: lineage.familyId,
    ancestry: identity.ancestry,
    ancestryId: identity.ancestryId,
    lineageId: identity.lineageId,
    ancestryLabel,
    locationLabel,
    locationId: identity.currentLocationId,
    appearanceSummary: identity.appearance.summary,
    appearanceTags: identity.appearance.appearanceTags,
    portraitUrl: identity.appearance.portraitUrl,
    temporalBadges: buildTemporalBadges(lineage, campaignNow),
    lifeStatusVariant: status,
    partyParticipationChip: formatPartyParticipationChip(identity.partyParticipation),
  };
}
