export const WORKSPACE_RAIL_TAB_CLASS =
  'inline-flex shrink-0 snap-start items-center rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors';

export function workspaceRailTabClass(isActive: boolean): string {
  return `${WORKSPACE_RAIL_TAB_CLASS} ${
    isActive
      ? 'border-b-2 border-accent bg-accent/10 text-accent'
      : 'border-b-2 border-transparent text-muted hover:bg-elevated/60 hover:text-accent'
  }`;
}
