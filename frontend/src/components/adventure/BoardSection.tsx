import { QuestHubView } from '@/components/quest/QuestHubView';
import type { ReactNode } from 'react';

interface BoardSectionProps {
  campaignHandle: string;
  categoryPageId: string;
  playerPreview?: boolean;
  onHeaderToolbarChange?: (toolbar: ReactNode | null) => void;
}

/** Quest list + kanban (Story › Quests lens). */
export function BoardSection({
  campaignHandle,
  categoryPageId,
  playerPreview,
  onHeaderToolbarChange,
}: BoardSectionProps) {
  return (
    <QuestHubView
      campaignHandle={campaignHandle}
      categoryPageId={categoryPageId}
      embedded
      playerPreview={playerPreview}
      onHeaderToolbarChange={onHeaderToolbarChange}
    />
  );
}
