import {
  type ChronologyDateParts,
  compareChronologyDateParts,
  dateSortKey,
  normalizeChronologyDateParts,
} from '@shared/chronologyTypes';
import {
  buildRevelationViewerContext,
  isEntityRelationVisible,
  projectEntityRelation,
} from '@shared/narrativeProjection';

export type { ChronologyDateParts };
export { dateSortKey, compareChronologyDateParts as compareDateParts };

export type RelationVisibility = 'PUBLIC' | 'PARTY' | 'GM_ONLY' | 'SECRET';

export const RELATION_VISIBILITIES: RelationVisibility[] = [
  'PUBLIC',
  'PARTY',
  'GM_ONLY',
  'SECRET',
];

export type OrgRelationCategory =
  | 'DIPLOMATIC'
  | 'ECONOMIC'
  | 'RELIGIOUS'
  | 'MILITARY'
  | 'CRIMINAL'
  | 'SECRET'
  | 'BLOODLINE';

export const ORG_RELATION_CATEGORIES: OrgRelationCategory[] = [
  'DIPLOMATIC',
  'ECONOMIC',
  'RELIGIOUS',
  'MILITARY',
  'CRIMINAL',
  'SECRET',
  'BLOODLINE',
];

export type OrgRelationStance =
  | 'ALLY'
  | 'NEUTRAL'
  | 'HOSTILE'
  | 'SECRET_HOSTILE'
  | 'VASSAL'
  | 'UNKNOWN';

export const ORG_RELATION_STANCES: OrgRelationStance[] = [
  'ALLY',
  'NEUTRAL',
  'HOSTILE',
  'SECRET_HOSTILE',
  'VASSAL',
  'UNKNOWN',
];

export interface CitationHooks {
  note?: string | null;
  sourcePageIds?: string[];
  sourceEventIds?: string[];
}

export interface IdentifiableRecord {
  id: string;
}

export function normalizeRelationVisibility(raw: unknown): RelationVisibility {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((RELATION_VISIBILITIES as readonly string[]).includes(upper)) {
      return upper as RelationVisibility;
    }
  }
  return 'GM_ONLY';
}

export function normalizeOrgRelationCategory(raw: unknown): OrgRelationCategory {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((ORG_RELATION_CATEGORIES as readonly string[]).includes(upper)) {
      return upper as OrgRelationCategory;
    }
  }
  return 'DIPLOMATIC';
}

export function normalizeOrgRelationStance(raw: unknown): OrgRelationStance {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((ORG_RELATION_STANCES as readonly string[]).includes(upper)) {
      return upper as OrgRelationStance;
    }
  }
  return 'UNKNOWN';
}

export function normalizeNullableInt(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw);
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeChronologyDate(raw: unknown): ChronologyDateParts | null {
  return normalizeChronologyDateParts(raw);
}

export function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim());
}

export function normalizeNullablePageId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeNullableText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRecordId(raw: unknown, fallback?: string): string {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return fallback ?? crypto.randomUUID();
}

export function isRelationVisibleToViewer(
  visibility: RelationVisibility,
  isDMUser: boolean,
): boolean {
  const ctx = buildRevelationViewerContext({
    role: isDMUser ? 'GAMEMASTER' : 'Player',
    isManagerView: isDMUser,
  });
  return isEntityRelationVisible(projectEntityRelation(visibility, ctx));
}
