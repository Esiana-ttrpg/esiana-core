import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';

const segmentClass =
  'rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors';

export function AdventurePlayerPreviewToggle({ className = '' }: { className?: string }) {
  const workspace = useOptionalAdventureWorkspace();

  if (!workspace?.active || !workspace.isDMUser) {
    return null;
  }

  const { playerPreview, setPlayerPreview } = workspace;

  return (
    <div
      role="group"
      aria-label="Adventure view perspective"
      className={`inline-flex shrink-0 rounded-lg border border-border bg-surface/80 p-0.5 ${className}`}
    >
      <button
        type="button"
        aria-pressed={!playerPreview}
        onClick={() => setPlayerPreview(false)}
        className={`${segmentClass} ${
          !playerPreview
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-muted hover:text-foreground'
        }`}
      >
        DM
      </button>
      <button
        type="button"
        aria-pressed={playerPreview}
        onClick={() => setPlayerPreview(true)}
        className={`${segmentClass} ${
          playerPreview
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-muted hover:text-foreground'
        }`}
      >
        Party
      </button>
    </div>
  );
}
