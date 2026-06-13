import { useCallback, useMemo } from 'react';
import {
  DEFAULT_BLOCK_DISPLAY_STATE,
  type BlockDisplayState,
} from '@/lib/blockDisplayState';
import type { WorkspaceOrchestrationProfile } from '@/lib/workspaceOrchestration';
import type { BlockActionHandlers } from '@/lib/blockCapabilities';

export interface UseBlockActionsArgs {
  blockDisplayState: BlockDisplayState;
  onBlockDisplayChange?: (next: BlockDisplayState) => void;
  useEditorialFlow: boolean;
  orchestration: WorkspaceOrchestrationProfile;
  onJumpToContinuityOverride?: (blockId: string) => void;
}

export function useBlockActions({
  blockDisplayState,
  onBlockDisplayChange,
  useEditorialFlow,
  orchestration,
  onJumpToContinuityOverride,
}: UseBlockActionsArgs): BlockActionHandlers {
  const scrollBlockIntoView = useCallback((blockId: string) => {
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-codex-block-id="${blockId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const onFocusBlock = useCallback(
    (blockId: string) => {
      if (!onBlockDisplayChange) return;
      onBlockDisplayChange({ activeBlockId: blockId, scale: 'focused' });
    },
    [onBlockDisplayChange],
  );

  const onExpandBlock = useCallback(
    (blockId: string) => {
      if (!onBlockDisplayChange || !useEditorialFlow) return;
      if (orchestration.preferFocusOverlay) {
        onFocusBlock(blockId);
        return;
      }
      if (
        blockDisplayState.activeBlockId === blockId &&
        blockDisplayState.scale === 'expanded'
      ) {
        onBlockDisplayChange(DEFAULT_BLOCK_DISPLAY_STATE);
        return;
      }
      onBlockDisplayChange({ activeBlockId: blockId, scale: 'expanded' });
      scrollBlockIntoView(blockId);
    },
    [
      blockDisplayState.activeBlockId,
      blockDisplayState.scale,
      onBlockDisplayChange,
      onFocusBlock,
      orchestration.preferFocusOverlay,
      scrollBlockIntoView,
      useEditorialFlow,
    ],
  );

  const onJumpToContinuity = useCallback(
    (blockId: string) => {
      if (onJumpToContinuityOverride) {
        onJumpToContinuityOverride(blockId);
        return;
      }
      scrollBlockIntoView(blockId);
    },
    [onJumpToContinuityOverride, scrollBlockIntoView],
  );

  const onCloseFocus = useCallback(() => {
    onBlockDisplayChange?.(DEFAULT_BLOCK_DISPLAY_STATE);
  }, [onBlockDisplayChange]);

  const onCollapseFocusToExpanded = useCallback(() => {
    if (!blockDisplayState.activeBlockId || !onBlockDisplayChange) return;
    onBlockDisplayChange({
      activeBlockId: blockDisplayState.activeBlockId,
      scale: 'expanded',
    });
  }, [blockDisplayState.activeBlockId, onBlockDisplayChange]);

  return useMemo(
    () => ({
      onExpandBlock,
      onFocusBlock,
      onJumpToContinuity,
      onCloseFocus,
      onCollapseFocusToExpanded,
    }),
    [
      onCollapseFocusToExpanded,
      onCloseFocus,
      onExpandBlock,
      onFocusBlock,
      onJumpToContinuity,
    ],
  );
}
