import type { ReactNode } from 'react';

/**
 * Workspace rail layout variants. Not all rails are section tabs — e.g. Timeline
 * may use `toolbar` (filters + scale), Storyboard `toolbar` (tools), Bestiary
 * `hybrid` (search + filters). Future: register via WorkspaceRailContext.
 */
export type WorkspaceRailVariant = 'tabs' | 'toolbar' | 'hybrid';

export interface WorkspaceRailConfig {
  variant: WorkspaceRailVariant;
  start: ReactNode;
  end?: ReactNode;
}

export interface WorkspaceContextStripConfig {
  items: ReactNode;
}

export interface WorkspaceChromeConfig {
  rail: WorkspaceRailConfig | null;
  strip: WorkspaceContextStripConfig | null;
}

export const EMPTY_WORKSPACE_CHROME: WorkspaceChromeConfig = {
  rail: null,
  strip: null,
};
