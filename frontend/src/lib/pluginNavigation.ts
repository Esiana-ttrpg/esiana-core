import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

/** Preferred section for new registrations; legacy values remapped to plugins. */
export type PluginSidebarSection =
  | 'plugins'
  | 'campaign'
  | 'play'
  | 'world'
  | 'timeline'
  | 'tools';

export interface PluginSidebarItemDefinition {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  section: 'plugins';
  pageId: string;
}

const sidebarItems = new Map<string, PluginSidebarItemDefinition>();

export function registerPluginSidebarItem(
  pluginId: string,
  definition: {
    id: string;
    label: string;
    icon?: string;
    section?: PluginSidebarSection;
    pageId: string;
  },
): void {
  sidebarItems.set(`${pluginId}:${definition.id}`, {
    id: definition.id,
    pluginId,
    label: definition.label,
    icon: definition.icon,
    section: 'plugins',
    pageId: definition.pageId,
  });
}

export function listPluginSidebarItems(
  section?: PluginSidebarSection,
): PluginSidebarItemDefinition[] {
  const all = [...sidebarItems.values()];
  // All plugin nav items live under the plugins default zone; section filter kept for API compat.
  if (!section || section === 'plugins') return all;
  return [];
}

export function clearPluginNavigationRegistry(): void {
  sidebarItems.clear();
}

export function resolvePluginSidebarIcon(icon?: string): LucideIcon | null {
  if (!icon) return null;
  const name = icon.startsWith('lucide:') ? icon.slice('lucide:'.length) : icon;
  const resolved = (LucideIcons as unknown as Record<string, LucideIcon | undefined>)[name];
  return resolved ?? null;
}

export function pluginPagePath(
  campaignHandle: string,
  pluginId: string,
  pageId: string,
  subpath?: string,
): string {
  const base = `/campaigns/${encodeURIComponent(campaignHandle)}/plugin/${encodeURIComponent(pluginId)}/${encodeURIComponent(pageId)}`;
  if (!subpath) return base;
  return `${base}/${subpath.split('/').map(encodeURIComponent).join('/')}`;
}

export function globalPluginPagePath(
  pluginId: string,
  pageId: string,
  subpath?: string,
): string {
  const base = `/plugins/${encodeURIComponent(pluginId)}/${encodeURIComponent(pageId)}`;
  if (!subpath) return base;
  return `${base}/${subpath.split('/').map(encodeURIComponent).join('/')}`;
}

export function isPluginPageActive(
  pathname: string,
  pluginId: string,
  pageId: string,
): boolean {
  return pathname.includes(`/plugin/${pluginId}/${pageId}`) ||
    pathname.includes(`/plugins/${pluginId}/${pageId}`);
}
