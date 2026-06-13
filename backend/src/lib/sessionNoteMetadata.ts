/**
 * Session note metadata: anchor timeline pages vs per-author SESSION_NOTE rows.
 *
 * - Anchor: one WikiPage per CampaignSessionTimeline (isSessionAnchor).
 * - Author: optional per-member pages sharing sessionGroupId + timelinePointId.
 */

export interface SessionNoteMetadataFields {
  sessionNoteAuthorId?: string;
  locationPageId?: string;
  sessionGroupId?: string;
  timelinePointId?: string;
  /** Campaign fantasy calendar epoch minute at session snapshot (string bigint). */
  fantasyEpochMinute?: string;
  isSessionAnchor?: boolean;
  isSessionAuthor?: boolean;
}

export function parseSessionNoteMetadata(metadata: unknown): SessionNoteMetadataFields {
  if (!metadata || typeof metadata !== 'object') return {};
  const raw = metadata as Record<string, unknown>;
  return {
    sessionNoteAuthorId:
      typeof raw.sessionNoteAuthorId === 'string' && raw.sessionNoteAuthorId.trim()
        ? raw.sessionNoteAuthorId.trim()
        : undefined,
    locationPageId:
      typeof raw.locationPageId === 'string' && raw.locationPageId.trim()
        ? raw.locationPageId.trim()
        : undefined,
    sessionGroupId:
      typeof raw.sessionGroupId === 'string' && raw.sessionGroupId.trim()
        ? raw.sessionGroupId.trim()
        : undefined,
    timelinePointId:
      typeof raw.timelinePointId === 'string' && raw.timelinePointId.trim()
        ? raw.timelinePointId.trim()
        : undefined,
    fantasyEpochMinute:
      typeof raw.fantasyEpochMinute === 'string' && raw.fantasyEpochMinute.trim()
        ? raw.fantasyEpochMinute.trim()
        : undefined,
    isSessionAnchor: raw.isSessionAnchor === true,
    isSessionAuthor: raw.isSessionAuthor === true,
  };
}

export function mergeSessionNoteMetadata(
  existing: unknown,
  patch: SessionNoteMetadataFields,
): SessionNoteMetadataFields {
  return { ...parseSessionNoteMetadata(existing), ...patch };
}

export function getSessionNoteAuthorId(metadata: unknown): string | null {
  return parseSessionNoteMetadata(metadata).sessionNoteAuthorId ?? null;
}

export function isSessionAnchorPage(metadata: unknown): boolean {
  return parseSessionNoteMetadata(metadata).isSessionAnchor === true;
}

export function isSessionAuthorPage(metadata: unknown): boolean {
  const parsed = parseSessionNoteMetadata(metadata);
  return (
    parsed.isSessionAuthor === true ||
    (Boolean(parsed.sessionGroupId) && !parsed.isSessionAnchor)
  );
}

/** Standalone imported/uploaded session notes (not timeline anchor or per-author rows). */
export function isLegacyStandaloneSessionNote(metadata: unknown): boolean {
  const parsed = parseSessionNoteMetadata(metadata);
  if (parsed.isSessionAnchor) return false;
  if (parsed.isSessionAuthor) return false;
  if (parsed.timelinePointId) return false;
  if (parsed.sessionGroupId) return false;
  return true;
}
