import { QuestHubView } from '@/components/quest/QuestHubView';

interface BoardSectionProps {
  campaignHandle: string;
  categoryPageId: string;
  playerPreview?: boolean;
}

/** Quest list + kanban (Story › Quests lens). */
export function BoardSection({
  campaignHandle,
  categoryPageId,
  playerPreview,
}: BoardSectionProps) {
  return (
    <QuestHubView
      campaignHandle={campaignHandle}
      categoryPageId={categoryPageId}
      embedded
      playerPreview={playerPreview}
    />
  );
}
