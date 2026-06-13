import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export type PluginSidebarSection = 'campaign' | 'play' | 'world' | 'timeline' | 'tools';

export interface PluginSidebarItemDefinition {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  section: PluginSidebarSection;
  pageId: string;
}

const sidebarItems = new Map<string, PluginSidebarItemDefinition>();

export function registerPluginSidebarItem(
  pluginId: string,
  definition: Omit<PluginSidebarItemDefinition, 'pluginId'>,
): void {
  sidebarItems.set(`${pluginId}:${definition.id}`, {
    ...definition,
    pluginId,
  });
}

export function listPluginSidebarItems(section?: PluginSidebarSection): PluginSidebarItemDefinition[] {
  const all = [...sidebarItems.values()];
  return section ? all.filter((item) => item.section === section) : all;
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

export function isPluginPageActive(
  pathname: string,
  pluginId: string,
  pageId: string,
): boolean {
  return pathname.includes(`/plugin/${pluginId}/${pageId}`);
}
