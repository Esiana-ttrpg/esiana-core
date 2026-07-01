import type { ThreadsLensId } from '@/lib/adventureLayout';

interface ThreadsLensViewToggleProps {
  threadsLens: ThreadsLensId;
  onThreadsLensChange: (lens: ThreadsLensId) => void;
}

export function ThreadsLensViewToggle({
  threadsLens,
  onThreadsLensChange,
}: ThreadsLensViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-elevated/50 p-1">
      <button
        type="button"
        onClick={() => onThreadsLensChange('all')}
        className={`rounded px-2.5 py-1.5 text-sm ${
          threadsLens === 'all'
            ? 'bg-primary/20 text-primary'
            : 'text-muted hover:text-foreground'
        }`}
      >
        All threads
      </button>
      <button
        type="button"
        onClick={() => onThreadsLensChange('activity')}
        className={`rounded px-2.5 py-1.5 text-sm ${
          threadsLens === 'activity'
            ? 'bg-primary/20 text-primary'
            : 'text-muted hover:text-foreground'
        }`}
      >
        Recent activity
      </button>
    </div>
  );
}
