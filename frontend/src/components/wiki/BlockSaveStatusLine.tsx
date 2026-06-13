import type { BlockSaveState } from '@/contexts/PageBlockDraftRegistry';

interface BlockSaveStatusLineProps {
  state: BlockSaveState;
  onRetry?: () => void;
}

export function BlockSaveStatusLine({ state, onRetry }: BlockSaveStatusLineProps) {
  if (state.status === 'idle') return null;

  const label =
    state.status === 'dirty'
      ? 'Unsaved changes'
      : state.status === 'saving'
        ? 'Saving…'
        : state.status === 'saved'
          ? 'Saved'
          : state.status === 'failed'
            ? state.errorMessage?.trim() || 'Save failed'
            : null;

  if (!label) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="status">
      <p
        className={`text-xs ${
          state.status === 'failed' ? 'text-red-400/90' : 'text-muted'
        }`}
      >
        {label}
      </p>
      {state.status === 'failed' && onRetry ? (
        <button
          type="button"
          onClick={() => void onRetry()}
          className="text-xs font-medium text-primary hover:text-primary-hover"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
