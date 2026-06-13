/**
 * Layer 1 — page narrative status (GM canon editorial state).
 * Values must stay in 1:1 sync with Prisma enum PageNarrativeStatusType.
 * @see docs/plans/canonical-page-editor.md
 */
import type { NarrativeViewerContext } from './narrativeProjection.js';

export const PAGE_NARRATIVE_STATUS_SEMANTICS_VERSION = 'page-narrative-status-v1';

/** Must stay in 1:1 sync with Prisma enum PageNarrativeStatusType */
export const PageNarrativeStatuses = {
  ACTIVE: 'ACTIVE',
  MISSING: 'MISSING',
  DEAD: 'DEAD',
  ARCHIVED: 'ARCHIVED',
  RUMORED: 'RUMORED',
  RETIRED: 'RETIRED',
  HISTORICAL: 'HISTORICAL',
  LEGENDARY: 'LEGENDARY',
  SECRET: 'SECRET',
} as const;

export type PageNarrativeStatusValue =
  (typeof PageNarrativeStatuses)[keyof typeof PageNarrativeStatuses];

export const ALL_PAGE_NARRATIVE_STATUSES: readonly PageNarrativeStatusValue[] =
  Object.values(PageNarrativeStatuses);

export type PageNarrativeStatusTone =
  | 'neutral'
  | 'muted'
  | 'warning'
  | 'legend'
  | 'secret';

export type PageNarrativeStatusCssModifier =
  | 'none'
  | 'muted'
  | 'strikethrough'
  | 'legend';

export interface PageNarrativeStatusRecord {
  wikiPageId: string;
  status: PageNarrativeStatusValue;
  reason?: string | null;
}

export interface PageNarrativeStatusProjection {
  status: PageNarrativeStatusValue;
  label: string;
  tone: PageNarrativeStatusTone;
  cssModifier: PageNarrativeStatusCssModifier;
  visibleToParty: boolean;
  reason?: string | null;
}

/** Legacy character identity status → page narrative status */
export type CharacterLifeStatusFallback =
  | 'ALIVE'
  | 'DECEASED'
  | 'MISSING'
  | 'EXILED'
  | 'UNKNOWN';

const STATUS_SET = new Set<string>(ALL_PAGE_NARRATIVE_STATUSES);

export function normalizePageNarrativeStatus(
  raw: unknown,
): PageNarrativeStatusValue | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (!STATUS_SET.has(upper)) return null;
  return upper as PageNarrativeStatusValue;
}

export function mapCharacterLifeStatusToNarrativeStatus(
  lifeStatus: CharacterLifeStatusFallback,
): PageNarrativeStatusValue | null {
  switch (lifeStatus) {
    case 'ALIVE':
      return PageNarrativeStatuses.ACTIVE;
    case 'DECEASED':
      return PageNarrativeStatuses.DEAD;
    case 'MISSING':
      return PageNarrativeStatuses.MISSING;
    case 'EXILED':
      return PageNarrativeStatuses.RETIRED;
    case 'UNKNOWN':
      return null;
    default:
      return null;
  }
}

export function resolvePageNarrativeStatus(input: {
  storedStatus?: PageNarrativeStatusValue | null;
  characterLifeStatus?: CharacterLifeStatusFallback | null;
}): PageNarrativeStatusValue {
  if (input.storedStatus) return input.storedStatus;
  const mapped = input.characterLifeStatus
    ? mapCharacterLifeStatusToNarrativeStatus(input.characterLifeStatus)
    : null;
  return mapped ?? PageNarrativeStatuses.ACTIVE;
}

export function formatPageNarrativeStatusLabel(
  status: PageNarrativeStatusValue,
): string {
  switch (status) {
    case PageNarrativeStatuses.ACTIVE:
      return 'Active';
    case PageNarrativeStatuses.MISSING:
      return 'Missing';
    case PageNarrativeStatuses.DEAD:
      return 'Dead';
    case PageNarrativeStatuses.ARCHIVED:
      return 'Archived';
    case PageNarrativeStatuses.RUMORED:
      return 'Rumored';
    case PageNarrativeStatuses.RETIRED:
      return 'Retired';
    case PageNarrativeStatuses.HISTORICAL:
      return 'Historical';
    case PageNarrativeStatuses.LEGENDARY:
      return 'Legendary';
    case PageNarrativeStatuses.SECRET:
      return 'Secret';
    default:
      return status;
  }
}

export function pageNarrativeStatusTone(
  status: PageNarrativeStatusValue,
): PageNarrativeStatusTone {
  switch (status) {
    case PageNarrativeStatuses.DEAD:
    case PageNarrativeStatuses.MISSING:
    case PageNarrativeStatuses.ARCHIVED:
    case PageNarrativeStatuses.RETIRED:
      return 'muted';
    case PageNarrativeStatuses.RUMORED:
    case PageNarrativeStatuses.LEGENDARY:
    case PageNarrativeStatuses.HISTORICAL:
      return 'legend';
    case PageNarrativeStatuses.SECRET:
      return 'secret';
    default:
      return 'neutral';
  }
}

export function pageNarrativeStatusCssModifier(
  status: PageNarrativeStatusValue,
): PageNarrativeStatusCssModifier {
  switch (status) {
    case PageNarrativeStatuses.DEAD:
    case PageNarrativeStatuses.MISSING:
    case PageNarrativeStatuses.ARCHIVED:
      return 'strikethrough';
    case PageNarrativeStatuses.RETIRED:
      return 'muted';
    case PageNarrativeStatuses.RUMORED:
    case PageNarrativeStatuses.LEGENDARY:
    case PageNarrativeStatuses.HISTORICAL:
      return 'legend';
    default:
      return 'none';
  }
}

export function shouldShowPageNarrativeStatusBadge(
  status: PageNarrativeStatusValue,
): boolean {
  return status !== PageNarrativeStatuses.ACTIVE;
}

export function isPageNarrativeStatusVisibleToParty(
  status: PageNarrativeStatusValue,
  ctx: NarrativeViewerContext,
): boolean {
  if (status !== PageNarrativeStatuses.SECRET) return true;
  return ctx.perspective === 'elevated';
}

export function projectPageNarrativeStatus(
  status: PageNarrativeStatusValue,
  ctx: NarrativeViewerContext,
  reason?: string | null,
): PageNarrativeStatusProjection {
  const visibleToParty = isPageNarrativeStatusVisibleToParty(status, ctx);
  return {
    status,
    label: formatPageNarrativeStatusLabel(status),
    tone: pageNarrativeStatusTone(status),
    cssModifier: pageNarrativeStatusCssModifier(status),
    visibleToParty,
    ...(reason ? { reason } : {}),
  };
}

export function parseStatusSearchToken(
  query: string,
): PageNarrativeStatusValue | null {
  const match = /\bstatus:(\S+)/i.exec(query);
  if (!match?.[1]) return null;
  return normalizePageNarrativeStatus(match[1]);
}

export function stripStatusSearchToken(query: string): string {
  return query.replace(/\bstatus:\S+\b/gi, '').trim();
}
