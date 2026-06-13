export type BlockDisplayScale = 'compact' | 'expanded' | 'focused';

export interface BlockDisplayState {
  activeBlockId: string | null;
  scale: BlockDisplayScale;
}

export const DEFAULT_BLOCK_DISPLAY_STATE: BlockDisplayState = {
  activeBlockId: null,
  scale: 'compact',
};

export function isBlockDisplayActive(
  state: BlockDisplayState,
  blockId: string,
): boolean {
  return state.activeBlockId === blockId && state.scale !== 'compact';
}
