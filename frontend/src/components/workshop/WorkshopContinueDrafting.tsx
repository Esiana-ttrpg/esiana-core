import type { WorkshopDocument } from '@shared/workshopDocument';

interface WorkshopContinueDraftingProps {
  drafts: WorkshopDocument[];
  onSelectDraft: (draftId: string) => void;
  onNewDraft: () => void;
  onResumeMostRecent: () => void;
  busy?: boolean;
}

export function WorkshopContinueDrafting({
  drafts,
  onSelectDraft,
  onNewDraft,
  onResumeMostRecent,
  busy = false,
}: WorkshopContinueDraftingProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center space-y-6">
      <header className="space-y-1 text-center">
        <h2 className="text-lg font-medium text-foreground">Continue drafting</h2>
        <p className="text-sm text-muted-foreground">
          Workshop remembers your drafts — pick up where you left off.
        </p>
      </header>

      {drafts.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-border/60 bg-elevated/20 p-2">
          {drafts.slice(0, 12).map((draft) => (
            <li key={draft.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSelectDraft(draft.id)}
                className="flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm hover:bg-elevated/60 disabled:opacity-60"
              >
                <span className="truncate font-medium text-foreground">{draft.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-muted-foreground">No drafts yet — start writing.</p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onResumeMostRecent}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary/50 disabled:opacity-60"
        >
          Resume most recent
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onNewDraft}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          + New draft
        </button>
      </div>
    </div>
  );
}
