import type { EntityGraphEdge } from '../../../shared/entityGraph.js';
import type { StoryboardViewV1 } from '../../../shared/storyboardProjection.js';

/** Strip author-controlled layout metadata that has no independent audience policy. */
export function restrictStoryboardLayout(layout: StoryboardViewV1, visibleIds: ReadonlySet<string>): StoryboardViewV1 {
  return {
    ...layout,
    nodes: layout.nodes.filter(node => visibleIds.has(node.entityId)).map(({ laneId: _laneId, ...node }) => node),
    edges: [],
    lanes: [],
    annotations: [],
    visibility: {},
  };
}

/** Apply before deriving graph labels, relationships or counts. */
export function restrictStoryboardEdges(edges: readonly EntityGraphEdge[], visibleIds: ReadonlySet<string>,
  canView: (visibility: string) => boolean = () => true): EntityGraphEdge[] {
  return edges.filter(edge => edge.visible === true &&
    edge.visibility != null && ['PUBLIC', 'PARTY', 'CAMPAIGN'].includes(edge.visibility.trim().toUpperCase()) && canView(edge.visibility) &&
    visibleIds.has(edge.source.entityId) &&
    visibleIds.has(edge.target.entityId) && (!edge.sourcePageId || visibleIds.has(edge.sourcePageId)));
}

/** Remove associations to anything outside the already-authorized arc inputs. */
export function restrictArcInputs<T extends { id: string; parentId: string | null; metadata: unknown }>(
  roots: string, quests: readonly T[], scenes: readonly T[],
): { quests: T[]; scenes: T[] } {
  const allowed = new Set(quests.map(row => row.id));
  const sanitize = (row: T): T => {
    const metadata = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? { ...row.metadata as Record<string, unknown> } : {};
    for (const field of ['containedPageIds', 'linkedQuestPageIds', 'linkedObjectivePageIds']) {
      if (Array.isArray(metadata[field])) metadata[field] = (metadata[field] as unknown[])
        .filter((id): id is string => typeof id === 'string' && allowed.has(id));
    }
    return { ...row, parentId: row.parentId === roots || (row.parentId && allowed.has(row.parentId)) ? row.parentId : null, metadata };
  };
  return { quests: quests.map(sanitize), scenes: scenes.map(sanitize) };
}
