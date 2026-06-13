import type { EditorInstrumentationState } from '@/hooks/useEditorInstrumentation';
import type { WorkshopDocument } from '@shared/workshopDocument';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'a few moments';
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

interface WorkshopAmbientCornerProps {
  recentDrafts: WorkshopDocument[];
  activeDraftId: string | null;
  onSelectDraft: (draftId: string) => void;
  instrumentation: EditorInstrumentationState;
  continuityNudge?: string | null;
}

export function WorkshopAmbientCorner({
  recentDrafts,
  activeDraftId,
  onSelectDraft,
  instrumentation,
  continuityNudge,
}: WorkshopAmbientCornerProps) {
  const nudge = instrumentation.breakNudgeVisible
    ? `You've been writing for ${formatDuration(instrumentation.sessionDurationMs)}. Take a short break?`
    : continuityNudge;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-20 flex max-w-xs flex-col items-end gap-2">
      {recentDrafts.length > 0 ? (
        <div className="pointer-events-auto rounded-lg border border-border/50 bg-surface/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          <p className="mb-1 font-medium text-foreground/80">Recent</p>
          <ul className="space-y-0.5">
            {recentDrafts.slice(0, 5).map((draft) => (
              <li key={draft.id}>
                <button
                  type="button"
                  onClick={() => onSelectDraft(draft.id)}
                  className={`max-w-full truncate text-left hover:text-primary ${
                    draft.id === activeDraftId ? 'text-primary' : ''
                  }`}
                >
                  {draft.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {nudge ? (
        <div className="pointer-events-auto rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          <span>{nudge}</span>
          {instrumentation.breakNudgeVisible ? (
            <button
              type="button"
              className="ml-2 text-primary hover:underline"
              onClick={instrumentation.dismissBreakNudge}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
