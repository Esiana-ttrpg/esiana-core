/**
 * Downtime period entity annotations — derived + optional GM overlay (chronology-facing).
 * @see docs/architecture-internal/downtime-timeline.md
 */

export const DOWNTIME_ANNOTATIONS_VERSION = 'downtime-annotations-v1';

export const DOWNTIME_ENTITY_ROLES = [
  'present',
  'absent',
  'affected',
  'occupied',
] as const;

export type DowntimeEntityRole = (typeof DOWNTIME_ENTITY_ROLES)[number];

export type DowntimeEntityKind = 'character' | 'location' | 'organization';

export type DowntimeAnnotation = {
  entityPageId: string;
  entityKind?: DowntimeEntityKind;
  /** Projection-only display label — not persisted on GM overlays. */
  entityTitle?: string | null;
  role?: DowntimeEntityRole;
  note?: string | null;
  source: 'derived' | 'authored';
};

export type DowntimeLocationMention = {
  locationPageId?: string | null;
  note: string;
  source: 'derived' | 'authored';
};

export type DowntimeGapOverlay = {
  gapId: string;
  promotedLabel?: string | null;
  annotations?: DowntimeAnnotation[];
  locationMentions?: DowntimeLocationMention[];
};

export type DowntimeGapOverlayMap = Record<string, DowntimeGapOverlay>;

export const MAX_DOWNTIME_ANNOTATIONS_PER_PERIOD = 6;
export const MAX_DOWNTIME_LOCATION_MENTIONS_PER_PERIOD = 6;

function normalizeRole(raw: unknown): DowntimeEntityRole | undefined {
  if (typeof raw !== 'string') return undefined;
  const lower = raw.toLowerCase();
  return (DOWNTIME_ENTITY_ROLES as readonly string[]).includes(lower)
    ? (lower as DowntimeEntityRole)
    : undefined;
}

function normalizeEntityKind(raw: unknown): DowntimeEntityKind | undefined {
  if (raw === 'character' || raw === 'location' || raw === 'organization') {
    return raw;
  }
  return undefined;
}

function normalizeSource(raw: unknown): 'derived' | 'authored' {
  return raw === 'authored' ? 'authored' : 'derived';
}

export function parseDowntimeAnnotation(raw: unknown): DowntimeAnnotation | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.entityPageId !== 'string' || !obj.entityPageId.trim()) return null;
  return {
    entityPageId: obj.entityPageId.trim(),
    entityKind: normalizeEntityKind(obj.entityKind),
    role: normalizeRole(obj.role),
    note: typeof obj.note === 'string' ? obj.note : null,
    source: normalizeSource(obj.source),
  };
}

export function parseDowntimeLocationMention(raw: unknown): DowntimeLocationMention | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.note !== 'string' || !obj.note.trim()) return null;
  const locationPageId =
    typeof obj.locationPageId === 'string' && obj.locationPageId.trim()
      ? obj.locationPageId.trim()
      : null;
  return {
    locationPageId,
    note: obj.note.trim(),
    source: normalizeSource(obj.source),
  };
}

export function parseDowntimeGapOverlay(raw: unknown): DowntimeGapOverlay | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.gapId !== 'string' || !obj.gapId.trim()) return null;
  const annotations = Array.isArray(obj.annotations)
    ? obj.annotations
        .map(parseDowntimeAnnotation)
        .filter((a): a is DowntimeAnnotation => a !== null)
    : undefined;
  const locationMentions = Array.isArray(obj.locationMentions)
    ? obj.locationMentions
        .map(parseDowntimeLocationMention)
        .filter((m): m is DowntimeLocationMention => m !== null)
    : undefined;
  return {
    gapId: obj.gapId.trim(),
    promotedLabel:
      typeof obj.promotedLabel === 'string' ? obj.promotedLabel : null,
    annotations,
    locationMentions,
  };
}

export function parseDowntimeGapOverlayMap(raw: unknown): DowntimeGapOverlayMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: DowntimeGapOverlayMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = parseDowntimeGapOverlay(
      value && typeof value === 'object'
        ? { ...(value as Record<string, unknown>), gapId: key }
        : null,
    );
    if (parsed) out[key] = parsed;
  }
  return out;
}

/** Authored overlays win on entityPageId; derived fills remaining slots. */
export function mergeDowntimeAnnotations(
  authored: DowntimeAnnotation[],
  derived: DowntimeAnnotation[],
  cap = MAX_DOWNTIME_ANNOTATIONS_PER_PERIOD,
): DowntimeAnnotation[] {
  const seen = new Set<string>();
  const merged: DowntimeAnnotation[] = [];
  for (const row of authored) {
    if (seen.has(row.entityPageId)) continue;
    seen.add(row.entityPageId);
    merged.push(row);
    if (merged.length >= cap) return merged;
  }
  for (const row of derived) {
    if (seen.has(row.entityPageId)) continue;
    seen.add(row.entityPageId);
    merged.push(row);
    if (merged.length >= cap) return merged;
  }
  return merged;
}

export function mergeDowntimeLocationMentions(
  authored: DowntimeLocationMention[],
  derived: DowntimeLocationMention[],
  cap = MAX_DOWNTIME_LOCATION_MENTIONS_PER_PERIOD,
): DowntimeLocationMention[] {
  const noteKey = (m: DowntimeLocationMention) =>
    `${m.locationPageId ?? ''}:${m.note.toLowerCase()}`;
  const seen = new Set<string>();
  const merged: DowntimeLocationMention[] = [];
  for (const row of authored) {
    const key = noteKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
    if (merged.length >= cap) return merged;
  }
  for (const row of derived) {
    const key = noteKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
    if (merged.length >= cap) return merged;
  }
  return merged;
}

export function formatDowntimeAnnotationRoleLabel(
  role: DowntimeEntityRole | undefined,
): string | null {
  if (!role) return null;
  switch (role) {
    case 'present':
      return 'present';
    case 'absent':
      return 'absent';
    case 'occupied':
      return 'occupied';
    case 'affected':
      return 'affected';
    default:
      return role;
  }
}
