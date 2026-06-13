import type { SessionNotesNotebookPage } from '@/types/wiki';

interface SessionTimelinePreviewProps {
  sessions: SessionNotesNotebookPage[];
  nextSessionTitle: string;
  currentCampaignDateLabel: string | null;
}

export function SessionTimelinePreview({
  sessions,
  nextSessionTitle,
  currentCampaignDateLabel,
}: SessionTimelinePreviewProps) {
  const lastTimelinePointId =
    sessions.length > 0 ? sessions[sessions.length - 1]?.timelinePointId : null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        New sessions snap to the current campaign clock. Advance time only when in-world downtime
        actually passed.
      </p>
      <ol className="space-y-2">
        {sessions.map((session) => (
          <li
            key={session.timelinePointId ?? session.id}
            className={`rounded-lg border px-3 py-2 text-sm ${
              session.timelinePointId === lastTimelinePointId
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-surface/40'
            }`}
          >
            <div className="font-medium text-foreground">{session.title}</div>
            {session.sequenceOrder != null ? (
              <div className="text-xs text-muted">Session #{session.sequenceOrder}</div>
            ) : null}
          </li>
        ))}
        <li className="rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-sm">
          <div className="font-medium text-foreground">{nextSessionTitle}</div>
          <div className="text-xs text-muted">
            {currentCampaignDateLabel
              ? `Anchors at ${currentCampaignDateLabel}`
              : 'Anchors at current campaign clock'}
          </div>
        </li>
      </ol>
    </div>
  );
}
