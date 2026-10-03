import { SessionAggregateNotesView } from '@/components/session/SessionAggregateNotesView';
import type { CombinedSessionNotesPayload } from '@/types/wiki';

interface SessionCombinedInlineViewProps {
  campaignHandle: string;
  payload: CombinedSessionNotesPayload;
  canManage: boolean;
  onRefresh?: () => void;
  onSelectAuthor?: (userId: string) => void;
}

export function SessionCombinedInlineView({
  campaignHandle,
  payload,
  onRefresh,
  onSelectAuthor,
}: SessionCombinedInlineViewProps) {
  return (
    <SessionAggregateNotesView
      campaignHandle={campaignHandle}
      payload={payload}
      onRefresh={onRefresh}
      onSelectAuthor={onSelectAuthor}
    />
  );
}
