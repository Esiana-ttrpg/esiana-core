export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'master-user-sidebar-collapsed';
export const SIDEBAR_COLLAPSED_EVENT = 'master-user-sidebar-collapsed-changed';

export function getSidebarCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
}

export function setSidebarCollapsedPreference(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? 'true' : 'false');
  window.dispatchEvent(
    new CustomEvent<boolean>(SIDEBAR_COLLAPSED_EVENT, { detail: collapsed }),
  );
}
