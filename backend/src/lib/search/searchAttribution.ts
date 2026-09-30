/**
 * Authoritative attribution for global-search `from:` filters.
 *
 * Do NOT treat creator, last editor, session author, and character owner as
 * equivalent. Each type has an explicit rule; null attribution never matches.
 */

import { getSessionNoteAuthorId } from '../sessionNoteMetadata.js';

export interface SearchAttributionSource {
  createdByUserId?: string | null;
  ownerType?: string | null;
  ownerUserId?: string | null;
  /** Session note metadata (raw JSON). */
  metadata?: unknown;
  /** CampaignSessionTimeline.authorId when linked. */
  timelineAuthorId?: string | null;
}

/**
 * Resolve the authoritative author userId for a searchable entity, or null
 * when attribution is unavailable / not defined.
 */
export function resolveSearchDocumentAuthor(
  typeKey: string,
  source: SearchAttributionSource,
): string | null {
  if (typeKey === 'session-note') {
    const fromMeta = getSessionNoteAuthorId(source.metadata);
    if (fromMeta) return fromMeta;
    if (source.timelineAuthorId) return source.timelineAuthorId;
    // Fall back to page creator only when no session-specific author exists.
    return source.createdByUserId ?? null;
  }

  if (typeKey === 'journal') {
    // Journals default to USER-owned by the creator; stewardship owner is
    // the authoritative author when ownerType is USER.
    if (source.ownerType === 'USER' && source.ownerUserId) {
      return source.ownerUserId;
    }
    return source.createdByUserId ?? null;
  }

  // All other wiki types: page creator.
  return source.createdByUserId ?? null;
}

/**
 * True when the document's authoritative author is in the allowed set.
 * Null author never matches. Empty allowedIds never matches.
 */
export function matchesAuthorFilter(
  typeKey: string,
  source: SearchAttributionSource,
  authorUserIds: string[] | null,
): boolean {
  if (authorUserIds == null) return true;
  if (authorUserIds.length === 0) return false;
  const author = resolveSearchDocumentAuthor(typeKey, source);
  if (!author) return false;
  return authorUserIds.includes(author);
}
