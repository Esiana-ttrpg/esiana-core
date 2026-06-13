/**
 * Layer 5 — structural progress from arc hierarchy nodes (derived, non-canonical).
 */
import type { ArcHierarchyNode } from './arcHierarchyProjection.js';

export interface ArcNodeProgress {
  completed: number;
  total: number;
  percent: number;
}

function isObjectiveComplete(status: string | undefined): boolean {
  if (!status) return false;
  const upper = status.toUpperCase();
  return upper === 'COMPLETED' || upper === 'SKIPPED';
}

function isQuestComplete(status: string | undefined): boolean {
  if (!status) return false;
  const lower = status.toLowerCase();
  return lower === 'complete' || lower === 'completed' || lower === 'resolved';
}

function collectProgress(node: ArcHierarchyNode): { completed: number; total: number } {
  if (node.kind === 'objective') {
    return {
      completed: isObjectiveComplete(node.objectiveStatus) ? 1 : 0,
      total: 1,
    };
  }
  if (node.kind === 'quest') {
    const childTotals = node.children.map(collectProgress);
    const childCompleted = childTotals.reduce((sum, c) => sum + c.completed, 0);
    const childTotal = childTotals.reduce((sum, c) => sum + c.total, 0);
    if (childTotal > 0) {
      return { completed: childCompleted, total: childTotal };
    }
    return {
      completed: isQuestComplete(node.questStatus) ? 1 : 0,
      total: 1,
    };
  }

  const childTotals = node.children.map(collectProgress);
  return {
    completed: childTotals.reduce((sum, c) => sum + c.completed, 0),
    total: childTotals.reduce((sum, c) => sum + c.total, 0),
  };
}

export function computeArcNodeProgress(node: ArcHierarchyNode): ArcNodeProgress | null {
  const { completed, total } = collectProgress(node);
  if (total === 0) return null;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}
