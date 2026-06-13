import type { SceneTimelineEntry } from '@shared/sceneTimelineProjection';

export const SCENE_TIMELINE_ORDER_STEP = 1024;

export function sceneTimelineSortKey(entry: SceneTimelineEntry): number {
  if (entry.sortOrder != null && Number.isFinite(entry.sortOrder)) {
    return entry.sortOrder;
  }
  return Number.MAX_SAFE_INTEGER;
}

export function compareSceneTimelineEntries(
  a: SceneTimelineEntry,
  b: SceneTimelineEntry,
): number {
  const diff = sceneTimelineSortKey(a) - sceneTimelineSortKey(b);
  if (diff !== 0) return diff;
  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
}

export function computeSceneTimelineOrderAtIndex(
  columnWithoutDragged: SceneTimelineEntry[],
  destinationIndex: number,
): number {
  const above = columnWithoutDragged[destinationIndex - 1];
  const below = columnWithoutDragged[destinationIndex];
  const aboveOrder = above ? sceneTimelineSortKey(above) : null;
  const belowOrder = below ? sceneTimelineSortKey(below) : null;

  if (aboveOrder == null && belowOrder == null) {
    return Date.now();
  }
  if (aboveOrder == null && belowOrder != null) {
    return belowOrder - SCENE_TIMELINE_ORDER_STEP;
  }
  if (aboveOrder != null && belowOrder == null) {
    return aboveOrder + SCENE_TIMELINE_ORDER_STEP;
  }

  const midpoint = (aboveOrder! + belowOrder!) / 2;
  if (midpoint === aboveOrder || midpoint === belowOrder) {
    return aboveOrder! + SCENE_TIMELINE_ORDER_STEP / 2;
  }
  return midpoint;
}

export function columnScenesWithoutDragged(
  columnScenes: SceneTimelineEntry[],
  draggedId: string,
): SceneTimelineEntry[] {
  return columnScenes.filter((scene) => scene.id !== draggedId);
}

export const UNSCHEDULED_COLUMN_ID = 'session:unscheduled';

export function sessionColumnId(sessionId: string | null): string {
  return sessionId == null ? UNSCHEDULED_COLUMN_ID : `session:${sessionId}`;
}

export function parseSessionColumnId(columnId: string): string | null {
  if (columnId === UNSCHEDULED_COLUMN_ID) return null;
  if (columnId.startsWith('session:')) {
    return columnId.slice('session:'.length);
  }
  return null;
}
