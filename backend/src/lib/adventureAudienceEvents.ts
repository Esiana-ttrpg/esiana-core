import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { isTimelineEventVisible, projectTimelineEventVisibility } from '../../../shared/narrativeProjection.js';
import type { ContentRevelationState } from '../../../shared/contentPresence.js';

/** Mirror chronology visibility and revelation before a preview is aggregated. */
export function filterAdventurePreviewEvents<T extends { id: string; visibility: string }>(
  events: readonly T[], canView: (visibility: string) => boolean,
  presence: Map<string, ContentRevelationState>, viewer: NarrativeViewerContext | null,
): T[] {
  if (!viewer || viewer.perspective !== 'party') return [];
  return events.filter(event => canView(event.visibility) &&
    isTimelineEventVisible(projectTimelineEventVisibility(event.id, event.visibility, presence, viewer)));
}
