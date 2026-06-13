import type { ReactNode } from 'react';
import { Lock, Trash2 } from 'lucide-react';
import type { WikiBlockVisibility, WikiPageBlock } from '@/types/wiki';
import { interactionInputProps } from './widgets/widgetInteraction';

interface WikiPageBlockShellProps {
  block: WikiPageBlock;
  showLayoutChrome: boolean;
  showReadTitle?: boolean;
  frameClassName: string;
  dimmed: boolean;
  readTitle: string;
  titleInputValue: string;
  visibility: WikiBlockVisibility;
  focusedPlaceholder?: boolean;
  measureRef?: (node: HTMLDivElement | null) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: WikiBlockVisibility) => void;
  onDelete: () => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  children: ReactNode;
}

export function WikiPageBlockShell({
  block,
  showLayoutChrome,
  showReadTitle = true,
  frameClassName,
  dimmed,
  readTitle,
  titleInputValue,
  visibility,
  focusedPlaceholder = false,
  measureRef,
  onTitleChange,
  onVisibilityChange,
  onDelete,
  onInteractionStart,
  onInteractionEnd,
  children,
}: WikiPageBlockShellProps) {
  const interaction = interactionInputProps({
    onInteractionStart,
    onInteractionEnd,
  });

  return (
    <div
      className={`${frameClassName} wiki-grid-block w-full min-w-0 flex flex-col${
        dimmed ? ' wiki-grid-block--dimmed' : ''
      }`}
      data-codex-block-id={block.id}
    >
      {!showLayoutChrome && showReadTitle && (
        <h3 className="mb-2 shrink-0 text-sm font-semibold tracking-wide text-muted">
          {readTitle}
        </h3>
      )}

      {showLayoutChrome && (
        <div className="pointer-events-auto flex shrink-0 flex-col gap-2 rounded-t-3xl border-b border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground">
            <span className="widget-drag-handle shrink-0 cursor-move">⠿</span>
            <input
              type="text"
              value={titleInputValue}
              onChange={(event) => onTitleChange(event.target.value)}
              {...interaction}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary/60"
              aria-label="Widget box title"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Lock className="size-4 shrink-0 text-muted" />
              <select
                value={visibility}
                onChange={(e) =>
                  onVisibilityChange(e.target.value as WikiBlockVisibility)
                }
                {...interaction}
                className="max-w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none"
                aria-label="Block visibility"
                title="Block visibility"
              >
                <option value="Public">Public</option>
                <option value="Party">Party-Visible</option>
                <option value="DM_Only">DM/Co-DM Only</option>
              </select>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md p-1 text-foreground hover:bg-elevated"
              title="Delete widget"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={measureRef}
        className={
          showLayoutChrome
            ? 'wiki-grid-widget-body flex w-full flex-col p-3'
            : 'wiki-grid-widget-body flex w-full flex-col'
        }
      >
        {focusedPlaceholder ? (
          <p className="py-6 text-center text-sm text-muted">Editing in focus mode</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
