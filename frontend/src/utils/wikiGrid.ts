import type { WikiPageBlock } from '@/types/wiki';

/** Strict 3-column wiki layout grid. */
export const WIKI_GRID_COLS = 3;
/** Minimum row slots when placing new blocks; runtime layout can grow taller. */
export const WIKI_GRID_MAX_ROWS = 3;
export const WIKI_GRID_RUNTIME_MAX_ROWS = 64;
export const WIKI_GRID_ROW_HEIGHT = 88;

type GridRect = Pick<WikiPageBlock, 'x' | 'y' | 'w' | 'h'>;

export function getOccupiedCells(rects: GridRect[]): Set<string> {
  const occupied = new Set<string>();
  for (const rect of rects) {
    for (let dx = 0; dx < rect.w; dx++) {
      for (let dy = 0; dy < rect.h; dy++) {
        occupied.add(`${rect.x + dx},${rect.y + dy}`);
      }
    }
  }
  return occupied;
}

export function getLayoutRowCapacity(rects: GridRect[]): number {
  if (rects.length === 0) return WIKI_GRID_MAX_ROWS;
  const bottom = rects.reduce((max, b) => Math.max(max, b.y + b.h), 0);
  return Math.min(WIKI_GRID_RUNTIME_MAX_ROWS, Math.max(WIKI_GRID_MAX_ROWS, bottom + 2));
}

export function getEmptyGridSlots(
  rects: GridRect[],
  maxRows?: number,
): Array<{ x: number; y: number }> {
  const rowCap = maxRows ?? getLayoutRowCapacity(rects);
  const occupied = getOccupiedCells(rects);
  const empty: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < rowCap; y++) {
    for (let x = 0; x < WIKI_GRID_COLS; x++) {
      if (!occupied.has(`${x},${y}`)) {
        empty.push({ x, y });
      }
    }
  }
  return empty;
}

/** Detect blocks saved with the legacy 12-column grid. */
export function usesLegacyTwelveColumnGrid(blocks: GridRect[]): boolean {
  return blocks.some((b) => b.w > WIKI_GRID_COLS || b.x + b.w > WIKI_GRID_COLS);
}

/** Best-effort conversion from 12-column coordinates to the 3-column grid. */
export function normalizeBlocksToThreeColumn(blocks: WikiPageBlock[]): WikiPageBlock[] {
  return blocks.map((block) => {
    const x = Math.min(WIKI_GRID_COLS - 1, Math.floor(block.x / 4));
    const w = Math.min(WIKI_GRID_COLS - x, Math.max(1, Math.round(block.w / 4)));
    const y = Math.max(0, Math.floor(block.y / 4));
    const h = Math.max(1, Math.round(block.h / 4));
    return { ...block, x, y, w, h };
  });
}
