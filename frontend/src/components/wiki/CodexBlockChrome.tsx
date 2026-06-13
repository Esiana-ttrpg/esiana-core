import { useEffect, useRef, type ReactNode } from 'react';
import { usePageBlockDraftRegistry } from '@/contexts/PageBlockDraftRegistry';
import type { WikiPageBlockType } from '@/types/wiki';
import {
  getBlockDensityProfile,
  measureContentClass,
  type WorkspaceMode,
} from '@/lib/surfaceDensityProfile';
import type { BlockDisplayScale } from '@/lib/blockDisplayState';
import { BlockActionToolbar } from '@/components/wiki/BlockActionToolbar';
import { BlockSaveStatusLine } from '@/components/wiki/BlockSaveStatusLine';
import type { BlockActionHandlers } from '@/lib/blockCapabilities';
import { SURFACE_OPERATIONAL_CLASS, TYPE_META_CLASS } from '@/lib/surfaceLayout';

interface CodexBlockChromeProps {
  blockId: string;
  blockType: WikiPageBlockType;
  title?: string;
  workspaceMode: WorkspaceMode;
  isEditingPage?: boolean;
  showLayoutChrome?: boolean;
  displayScale?: BlockDisplayScale;
  blockActionHandlers?: BlockActionHandlers;
  /** @deprecated Prefer blockActionHandlers */
  onExpandBlock?: (blockId: string) => void;
  /** @deprecated Prefer blockActionHandlers */
  onFocusBlock?: (blockId: string) => void;
  /** @deprecated Prefer blockActionHandlers */
  onJumpToContinuity?: (blockId: string) => void;
  onHeightChange?: (blockId: string, heightPx: number) => void;
  children: ReactNode;
  actions?: ReactNode;
}

function isReadingWorkspaceMode(mode: WorkspaceMode): boolean {
  return mode === 'focused' || mode === 'immersive';
}

export function CodexBlockChrome({
  blockId,
  blockType,
  title,
  workspaceMode,
  isEditingPage = false,
  showLayoutChrome = false,
  displayScale = 'compact',
  blockActionHandlers,
  onExpandBlock,
  onFocusBlock,
  onJumpToContinuity,
  onHeightChange,
  children,
  actions,
}: CodexBlockChromeProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const draftRegistry = usePageBlockDraftRegistry();
  const profile = getBlockDensityProfile(blockType);
  const measureClass = measureContentClass(
    profile.preferredMeasure,
    workspaceMode,
    profile.readableMeasureTier ?? 'active',
  );
  const saveState = draftRegistry?.getBlockSaveState(blockId) ?? { status: 'idle' as const };
  const showSaveStatus =
    isEditingPage && (saveState.status !== 'idle' || draftRegistry?.isBlockDirty(blockId));

  useEffect(() => {
    if (!onHeightChange || !contentRef.current) return;
    const el = contentRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        onHeightChange(blockId, Math.ceil(entry.contentRect.height));
      }
    });
    observer.observe(el);
    onHeightChange(blockId, Math.ceil(el.getBoundingClientRect().height));
    return () => observer.disconnect();
  }, [blockId, onHeightChange]);

  const displayTitle = title?.trim();
  const handlers: BlockActionHandlers = blockActionHandlers ?? {
    onExpandBlock,
    onFocusBlock,
    onJumpToContinuity,
  };
  const showEditAffordances =
    isEditingPage &&
    !showLayoutChrome &&
    (handlers.onExpandBlock || handlers.onFocusBlock);

  const editActions = showEditAffordances ? (
    <div className="flex shrink-0 items-center gap-1">
      <BlockActionToolbar
        blockId={blockId}
        blockType={blockType}
        displayScale={displayScale}
        handlers={handlers}
      />
      {actions}
    </div>
  ) : (
    actions
  );

  const statusLine =
    showSaveStatus && draftRegistry ? (
      <BlockSaveStatusLine
        state={
          saveState.status !== 'idle'
            ? saveState
            : { status: 'dirty' as const }
        }
        onRetry={
          saveState.status === 'failed'
            ? () => draftRegistry.flushBlock(blockId)
            : undefined
        }
      />
    ) : null;

  const useCollapsibleRead =
    !isEditingPage &&
    Boolean(displayTitle) &&
    isReadingWorkspaceMode(workspaceMode) &&
    !showLayoutChrome;

  if (useCollapsibleRead) {
    return (
      <details
        className="wiki-reader-collapsible flex min-w-0 flex-col"
        open
      >
        <summary className={`${TYPE_META_CLASS} ${SURFACE_OPERATIONAL_CLASS} flex min-w-0 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium normal-case tracking-normal marker:content-none [&::-webkit-details-marker]:hidden`}>
          <span className="min-w-0 truncate">{displayTitle}</span>
          {editActions}
        </summary>
        <div ref={contentRef} className={`mt-2 min-w-0 ${measureClass}`}>
          {children}
        </div>
      </details>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {displayTitle || editActions ? (
        <div className="flex min-w-0 items-center justify-between gap-2">
          {displayTitle ? (
            <h3 className={`${TYPE_META_CLASS} min-w-0 truncate text-sm font-medium normal-case tracking-normal`}>
              {displayTitle}
            </h3>
          ) : (
            <span />
          )}
          {editActions}
        </div>
      ) : null}
      <div ref={contentRef} className={`min-w-0 ${measureClass}`}>
        {children}
      </div>
      {statusLine}
    </div>
  );
}
