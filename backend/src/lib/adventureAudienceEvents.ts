import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { isTimelineEventVisible, projectTimelineEventVisibility } from '../../../shared/narrativeProjection.js';
import type { ContentRevelationState } from '../../../shared/contentPresence.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import { prisma } from './prisma.js';

/** Mirror chronology visibility and revelation before a preview is aggregated. */
export function filterAdventurePreviewEvents<T extends { id: string; visibility: string }>(
  events: readonly T[], canView: (visibility: string) => boolean,
  presence: Map<string, ContentRevelationState>, viewer: NarrativeViewerContext | null,
): T[] {
  if (!viewer || viewer.perspective !== 'party') return [];
  return events.filter(event => canView(event.visibility) &&
    isTimelineEventVisible(projectTimelineEventVisibility(event.id, event.visibility, presence, viewer)));
}

/** Resolve event visibility and revelation before exposing IDs in other projections. */
export async function visibleAdventureEventIds(
  campaignId: string, canView: (visibility: string) => boolean,
  viewer: NarrativeViewerContext | null,
): Promise<Set<string>> {
  if (!viewer || viewer.perspective !== 'party') return new Set();
  const [events, presenceRows] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { calendar: { campaignId } }, select: { id: true, visibility: true } }),
    prisma.contentPresenceState.findMany({
      where: { campaignId, entityType: ContentPresenceEntityType.TIMELINE_EVENT, subEntityId: null },
      select: { entityId: true, state: true, availableFromEpochMinute: true },
    }),
  ]);
  const presence = new Map<string, ContentRevelationState>(presenceRows.map(row => [row.entityId,
    row.availableFromEpochMinute != null && row.availableFromEpochMinute > viewer.campaignNow.epochMinute
      ? 'HIDDEN' : row.state as ContentRevelationState]));
  return new Set(filterAdventurePreviewEvents(events, canView, presence, viewer).map(event => event.id));
}
