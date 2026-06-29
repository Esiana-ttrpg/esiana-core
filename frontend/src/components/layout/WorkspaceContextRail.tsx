import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { GripVertical, X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  SURFACE_CONTEXTUAL_CLASS,
  SURFACE_CONTEXTUAL_INLINE_CLASS,
  TYPE_META_CLASS,
} from '@/lib/surfaceLayout';

export type WorkspaceContextRailLayout = 'inline' | 'overlay';

export interface WorkspaceContextRailProps {
  title: string;
  description?: string;
  layout: WorkspaceContextRailLayout;
  open?: boolean;
  onClose?: () => void;
  onWidthChange?: (width: number) => void;
  widthStyle?: CSSProperties;
  minWidth?: number;
  maxWidth?: number;
  ariaLabel?: string;
  onResizeStart?: (event: React.MouseEvent) => void;
  children: ReactNode;
}

function RailHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose?: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2.5">
      <div>
        <h2 className="text-sm font-semibold text-contextual-foreground/85">{title}</h2>
        {description ? (
          <p className={`${TYPE_META_CLASS} normal-case tracking-normal opacity-75`}>
            {description}
          </p>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted/80 hover:bg-[rgb(var(--color-focal-rgb)/0.06)] hover:text-foreground/90"
          aria-label="Close contextual panel"
        >
          <X className="size-5" />
        </button>
      ) : null}
    </header>
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (event: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      aria-label="Resize contextual panel"
      className="absolute left-0 top-0 z-[60] hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize md:flex"
      onMouseDown={onMouseDown}
    >
      <GripVertical className="size-3 text-muted" />
    </button>
  );
}

/**
 * Shared shell for selection-driven contextual rails.
 * Pages supply children only — no default filler content.
 */
export function WorkspaceContextRail({
  title,
  description,
  layout,
  open = true,
  onClose,
  onWidthChange,
  widthStyle,
  minWidth,
  maxWidth,
  ariaLabel,
  onResizeStart,
  children,
}: WorkspaceContextRailProps) {
  useBodyScrollLock(layout === 'overlay' && open);

  useEffect(() => {
    if (widthStyle?.width && typeof widthStyle.width === 'string') {
      const parsed = Number.parseInt(widthStyle.width, 10);
      if (!Number.isNaN(parsed)) onWidthChange?.(parsed);
    }
  }, [onWidthChange, widthStyle?.width]);

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      if (onResizeStart) {
        onResizeStart(event);
        return;
      }
      event.preventDefault();
    },
    [onResizeStart],
  );

  if (!open) return null;

  const scrollBody = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
  );

  const resolvedStyle: CSSProperties = {
    ...widthStyle,
    ...(minWidth !== undefined ? { minWidth: `${minWidth}px` } : {}),
    ...(maxWidth !== undefined ? { maxWidth: `${maxWidth}px` } : {}),
  };

  if (layout === 'inline') {
    return (
      <aside
        className={`${SURFACE_CONTEXTUAL_INLINE_CLASS} relative flex max-h-[calc(100dvh-var(--workspace-sticky-top,5rem))] w-full min-w-0 flex-col self-start lg:sticky lg:top-[var(--workspace-sticky-top,5rem)]`}
        style={resolvedStyle}
        aria-label={ariaLabel ?? title}
      >
        {onResizeStart ? <ResizeHandle onMouseDown={startResize} /> : null}
        <RailHeader title={title} description={description} />
        {scrollBody}
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close contextual panel backdrop"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside
        className={`${SURFACE_CONTEXTUAL_CLASS} fixed inset-y-0 right-0 z-50 flex max-h-[100dvh] flex-col overflow-hidden rounded-none shadow-xl`}
        style={resolvedStyle}
        aria-label={ariaLabel ?? title}
      >
        {onResizeStart ? <ResizeHandle onMouseDown={startResize} /> : null}
        <RailHeader title={title} description={description} onClose={onClose} />
        {scrollBody}
      </aside>
    </>
  );
}
