import { Clock, X } from 'lucide-react';

interface GlobalSearchRecentProps {
  items: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  onEnterCommands?: () => void;
}

export function GlobalSearchRecent({
  items,
  onSelect,
  onRemove,
  onClear,
  onEnterCommands,
}: GlobalSearchRecentProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <Clock className="mb-3 size-8 text-muted" strokeWidth={1.25} aria-hidden />
        <p className="text-sm font-medium text-foreground">Search this campaign</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Find characters, places, session notes, and more by title or content.
        </p>
        {onEnterCommands ? (
          <button
            type="button"
            onClick={onEnterCommands}
            className="mt-4 text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Type <kbd className="rounded border border-border/50 px-1">{'>'}</kbd> for
            commands
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Recent searches
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted hover:text-foreground"
        >
          Clear all
        </button>
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-elevated/70"
            >
              <Clock className="mr-2 inline size-3.5 text-muted" aria-hidden />
              {item}
            </button>
            <button
              type="button"
              aria-label={`Remove recent search ${item}`}
              onClick={() => onRemove(item)}
              className="rounded p-1.5 text-muted hover:bg-elevated hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {onEnterCommands ? (
        <p className="mt-3 px-1 text-xs text-muted">
          <button
            type="button"
            onClick={onEnterCommands}
            className="hover:text-foreground"
          >
            Type <kbd className="rounded border border-border/50 px-1">{'>'}</kbd> for
            commands
          </button>
        </p>
      ) : null}
    </div>
  );
}
