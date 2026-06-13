import { StoryboardSceneNode } from '@/components/adventure/storyboard/StoryboardSceneNode';
import { StoryboardQuestNode } from '@/components/adventure/storyboard/StoryboardQuestNode';
import { StoryboardThreadNode } from '@/components/adventure/storyboard/StoryboardThreadNode';
import { StoryboardEntityNode } from '@/components/adventure/storyboard/StoryboardEntityNode';

export const storyboardNodeTypes = {
  storyboardScene: StoryboardSceneNode,
  storyboardQuest: StoryboardQuestNode,
  storyboardThread: StoryboardThreadNode,
  storyboardEntity: StoryboardEntityNode,
};

export function storyboardNodeTypeForEntity(
  entityType: string,
): keyof typeof storyboardNodeTypes {
  switch (entityType) {
    case 'scene':
      return 'storyboardScene';
    case 'quest':
      return 'storyboardQuest';
    case 'thread':
      return 'storyboardThread';
    default:
      return 'storyboardEntity';
  }
}
