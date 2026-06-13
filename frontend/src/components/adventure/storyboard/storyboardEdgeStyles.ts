import type { StoryboardProjectedEdge } from '@shared/storyboardEdgeDerivation';
import { EntityRelationKinds } from '@shared/entityGraph';

export function storyboardEdgeStroke(edge: StoryboardProjectedEdge): string {
  switch (edge.relationKind) {
    case EntityRelationKinds.SCENE_FOLLOWS:
      return '#a78bfa';
    case EntityRelationKinds.SCENE_THREAD:
    case EntityRelationKinds.SCENE_CLUE:
      return '#f59e0b';
    case EntityRelationKinds.SCENE_QUEST:
    case EntityRelationKinds.OBJECTIVE_SCENE:
      return '#34d399';
    case EntityRelationKinds.SCENE_PARTICIPANT:
    case EntityRelationKinds.SCENE_LOCATION:
      return '#71717a';
    default:
      return '#71717a';
  }
}

export function storyboardEdgeAnimated(edge: StoryboardProjectedEdge): boolean {
  return edge.edgeKind === 'optional';
}

export function storyboardEdgeDash(edge: StoryboardProjectedEdge): string | undefined {
  if (edge.edgeKind === 'branch') return '6 4';
  if (edge.edgeKind === 'optional') return '5 5';
  return undefined;
}
