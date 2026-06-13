import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';

export const WORKSPACE_MODE_STORAGE_PREFIX = 'wiki-workspace-mode:';

export function loadWorkspaceMode(pageId: string, fallback: WorkspaceMode): WorkspaceMode {
  try {
    const raw = localStorage.getItem(`${WORKSPACE_MODE_STORAGE_PREFIX}${pageId}`);
    if (
      raw === 'focused' ||
      raw === 'balanced' ||
      raw === 'expanded' ||
      raw === 'immersive'
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function saveWorkspaceMode(pageId: string, mode: WorkspaceMode): void {
  try {
    localStorage.setItem(`${WORKSPACE_MODE_STORAGE_PREFIX}${pageId}`, mode);
  } catch {
    /* ignore */
  }
}
