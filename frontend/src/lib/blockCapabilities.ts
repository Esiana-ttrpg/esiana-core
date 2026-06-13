import type { LucideIcon } from 'lucide-react';
import { Maximize2, Scan, AlertCircle } from 'lucide-react';
import type { WikiPageBlockType } from '@/types/wiki';
import type { BlockDisplayScale } from '@/lib/blockDisplayState';

export type BlockActionId =
  | 'expand'
  | 'focus'
  | 'jump_to_continuity'
  | 'delete'
  | 'visibility'
  | 'duplicate'
  | 'convert'
  | 'open_references'
  | 'pin_overview';

export interface BlockActionDescriptor {
  id: BlockActionId;
  label: string;
  title: string;
  icon: LucideIcon;
  /** Shown in editorial edit chrome (not layout drag mode). */
  showInEditChrome?: boolean;
  /** Stub — wired when block-scoped continuity lands. */
  disabled?: boolean;
}

export interface BlockCapabilities {
  actions: BlockActionId[];
}

export const SEMANTIC_BLOCK_TYPES = [
  'entity-hero',
  'entity-org-hero',
  'entity-family-hero',
  'entity-location-hero',
  'entity-bestiary-hero',
  'entity-ancestry-hero',
  'entity-thread-properties',
  'entity-scene-properties',
  'entity-objective-properties',
  'entity-arc-properties',
  'entity-appearance',
  'entity-relationships',
  'entity-timeline',
  'entity-discovery',
  'text-biography',
] as const satisfies readonly WikiPageBlockType[];

export type SemanticBlockType = (typeof SEMANTIC_BLOCK_TYPES)[number];

const PROSE_BLOCK_TYPES: WikiPageBlockType[] = ['text-tiptap', 'text-biography'];

const DEFAULT_SEMANTIC_ACTIONS: BlockActionId[] = ['expand', 'focus', 'jump_to_continuity'];

const PROSE_ACTIONS: BlockActionId[] = ['expand', 'focus'];

const BLOCK_CAPABILITIES: Partial<Record<WikiPageBlockType, BlockCapabilities>> = {
  'text-tiptap': { actions: PROSE_ACTIONS },
  'text-biography': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-hero': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-org-hero': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-family-hero': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-location-hero': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-bestiary-hero': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-ancestry-hero': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-thread-properties': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-scene-properties': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-objective-properties': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-arc-properties': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-appearance': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-relationships': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-timeline': { actions: DEFAULT_SEMANTIC_ACTIONS },
  'entity-discovery': { actions: ['focus', 'jump_to_continuity'] },
};

export function getBlockCapabilities(blockType: WikiPageBlockType): BlockCapabilities {
  return BLOCK_CAPABILITIES[blockType] ?? { actions: [] };
}

export function isSemanticBlockType(blockType: WikiPageBlockType): boolean {
  return (
    (SEMANTIC_BLOCK_TYPES as readonly WikiPageBlockType[]).includes(blockType) ||
    PROSE_BLOCK_TYPES.includes(blockType)
  );
}

export interface BlockActionHandlers {
  onExpandBlock?: (blockId: string) => void;
  onFocusBlock?: (blockId: string) => void;
  onJumpToContinuity?: (blockId: string) => void;
  onCloseFocus?: () => void;
  onCollapseFocusToExpanded?: () => void;
}

export interface BlockActionContext {
  blockId: string;
  blockType: WikiPageBlockType;
  displayScale: BlockDisplayScale;
  handlers?: BlockActionHandlers;
  /** @deprecated Prefer handlers */
  onExpandBlock?: (blockId: string) => void;
  /** @deprecated Prefer handlers */
  onFocusBlock?: (blockId: string) => void;
  /** @deprecated Prefer handlers */
  onJumpToContinuity?: (blockId: string) => void;
}

function resolveHandlers(ctx: BlockActionContext): BlockActionHandlers {
  return {
    onExpandBlock: ctx.handlers?.onExpandBlock ?? ctx.onExpandBlock,
    onFocusBlock: ctx.handlers?.onFocusBlock ?? ctx.onFocusBlock,
    onJumpToContinuity: ctx.handlers?.onJumpToContinuity ?? ctx.onJumpToContinuity,
  };
}

export function executeBlockAction(
  actionId: BlockActionId,
  ctx: BlockActionContext,
): void {
  const handlers = resolveHandlers(ctx);
  if (actionId === 'expand') {
    handlers.onExpandBlock?.(ctx.blockId);
    return;
  }
  if (actionId === 'focus') {
    handlers.onFocusBlock?.(ctx.blockId);
    return;
  }
  if (actionId === 'jump_to_continuity') {
    handlers.onJumpToContinuity?.(ctx.blockId);
  }
}

export function resolveBlockActionDescriptors(
  ctx: BlockActionContext,
): BlockActionDescriptor[] {
  const caps = getBlockCapabilities(ctx.blockType);
  const handlers = resolveHandlers(ctx);
  const descriptors: BlockActionDescriptor[] = [];

  for (const id of caps.actions) {
    if (id === 'expand' && handlers.onExpandBlock) {
      descriptors.push({
        id: 'expand',
        label: 'Expand',
        title: 'Expand block',
        icon: Maximize2,
        showInEditChrome: true,
      });
    }
    if (id === 'focus' && handlers.onFocusBlock) {
      descriptors.push({
        id: 'focus',
        label: 'Focus',
        title: 'Focus mode',
        icon: Scan,
        showInEditChrome: true,
      });
    }
    if (id === 'jump_to_continuity') {
      descriptors.push({
        id: 'jump_to_continuity',
        label: 'Issues',
        title: 'Jump to continuity issues for this block',
        icon: AlertCircle,
        showInEditChrome: true,
        disabled: !handlers.onJumpToContinuity,
      });
    }
  }

  return descriptors.filter((d) => d.showInEditChrome);
}
