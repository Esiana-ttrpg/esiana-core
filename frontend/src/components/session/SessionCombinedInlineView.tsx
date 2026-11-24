import { SessionAggregateNotesView } from '@/components/session/SessionAggregateNotesView';
import type { CombinedSessionNotesPayload } from '@/types/wiki';

interface SessionCombinedInlineViewProps {
  readOnly?: boolean;
  campaignHandle: string;
  payload: CombinedSessionNotesPayload;
  canManage: boolean;
  onRefresh?: () => void;
  onSelectAuthor?: (userId: string) => void;
}

export function SessionCombinedInlineView({
  readOnly = false,
  campaignHandle,
  payload,
  onRefresh,
  onSelectAuthor,
}: SessionCombinedInlineViewProps) {
  return (
    <SessionAggregateNotesView
      readOnly={readOnly}
      campaignHandle={campaignHandle}
      payload={payload}
      onRefresh={onRefresh}
      onSelectAuthor={onSelectAuthor}
    />
  );
}
