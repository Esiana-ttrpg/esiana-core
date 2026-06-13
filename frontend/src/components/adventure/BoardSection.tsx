import { QuestHubView } from '@/components/quest/QuestHubView';

interface BoardSectionProps {
  campaignHandle: string;
  categoryPageId: string;
}

/** Quest list + kanban (Story › Quests lens). */
export function BoardSection({ campaignHandle, categoryPageId }: BoardSectionProps) {
  return (
    <QuestHubView campaignHandle={campaignHandle} categoryPageId={categoryPageId} embedded />
  );
}
