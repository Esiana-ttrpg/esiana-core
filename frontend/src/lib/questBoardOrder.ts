import type { QuestHubNode } from '@/types/wiki';

/** Gap inserted above/below neighbors when there is no adjacent card. */
export const BOARD_ORDER_STEP = 1024;

/** Fallback sort key when `boardOrder` is unset (epoch ms). */
export function questBoardSortKey(node: QuestHubNode): number {
  if (node.quest.boardOrder != null && Number.isFinite(node.quest.boardOrder)) {
    return node.quest.boardOrder;
  }
  const created = Date.parse(node.createdAt);
  if (Number.isFinite(created)) return created;
  const updated = Date.parse(node.updatedAt);
  if (Number.isFinite(updated)) return updated;
  return 0;
}

export function compareQuestBoardOrder(a: QuestHubNode, b: QuestHubNode): number {
  const diff = questBoardSortKey(a) - questBoardSortKey(b);
  if (diff !== 0) return diff;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function sortQuestHubNodesForBoard(nodes: QuestHubNode[]): QuestHubNode[] {
  return [...nodes].sort(compareQuestBoardOrder);
}

/**
 * Fractional index for a card dropped at `destinationIndex` within a column list
 * that does not yet include the dragged quest.
 */
export function computeBoardOrderAtIndex(
  columnWithoutDragged: QuestHubNode[],
  destinationIndex: number,
): number {
  const above = columnWithoutDragged[destinationIndex - 1];
  const below = columnWithoutDragged[destinationIndex];
  const aboveOrder = above ? questBoardSortKey(above) : null;
  const belowOrder = below ? questBoardSortKey(below) : null;

  if (aboveOrder == null && belowOrder == null) {
    return Date.now();
  }
  if (aboveOrder == null && belowOrder != null) {
    return belowOrder - BOARD_ORDER_STEP;
  }
  if (aboveOrder != null && belowOrder == null) {
    return aboveOrder + BOARD_ORDER_STEP;
  }

  const midpoint = (aboveOrder! + belowOrder!) / 2;
  if (midpoint === aboveOrder || midpoint === belowOrder) {
    return aboveOrder! + BOARD_ORDER_STEP / 2;
  }
  return midpoint;
}

/** Column list with dragged quest removed (for midpoint neighbors). */
export function columnQuestsWithoutDragged(
  columnQuests: QuestHubNode[],
  draggedQuestId: string,
): QuestHubNode[] {
  return columnQuests.filter((node) => node.id !== draggedQuestId);
}
