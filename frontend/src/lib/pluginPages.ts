import type { PluginApiClient } from './pluginApiClient';
import type { PluginSlotContext, PluginSlotRenderer } from '@/plugins/slots/types';

export interface PluginPageNavigation {
  location: {
    subpath: string;
    query: URLSearchParams;
  };
  push(input: { subpath?: string; query?: Record<string, string> }): void;
  replace(input: { subpath?: string; query?: Record<string, string> }): void;
}

export interface PluginPageDefinition {
  id: string;
  pluginId: string;
  title: string;
  render?: PluginPageRenderer;
}

export type PluginPageRenderer = (
  root: HTMLElement,
  context: PluginSlotContext,
  navigation: PluginPageNavigation,
) => void | (() => void) | Promise<void | (() => void)>;

const pluginPages = new Map<string, PluginPageDefinition>();

export function registerPluginPage(
  pluginId: string,
  definition: { id: string; title: string; render?: PluginPageRenderer },
): void {
  pluginPages.set(`${pluginId}:${definition.id}`, {
    ...definition,
    pluginId,
  });
}

export function getPluginPage(
  pluginId: string,
  pageId: string,
): PluginPageDefinition | undefined {
  return pluginPages.get(`${pluginId}:${pageId}`);
}

export function listPluginPages(pluginId?: string): PluginPageDefinition[] {
  const all = [...pluginPages.values()];
  return pluginId ? all.filter((page) => page.pluginId === pluginId) : all;
}

export function clearPluginPageRegistry(): void {
  pluginPages.clear();
}

export function createPluginPageNavigation(input: {
  campaignHandle: string;
  pluginId: string;
  pageId: string;
  pathname: string;
  search: string;
  navigate: (nextPath: string, replace?: boolean) => void;
}): PluginPageNavigation {
  const prefix = `/campaigns/${encodeURIComponent(input.campaignHandle)}/plugin/${encodeURIComponent(input.pluginId)}/${encodeURIComponent(input.pageId)}`;
  const remainder = input.pathname.startsWith(prefix)
    ? input.pathname.slice(prefix.length).replace(/^\//, '')
    : '';

  return {
    location: {
      subpath: remainder,
      query: new URLSearchParams(input.search),
    },
    push({ subpath, query }) {
      const path = buildPageUrl(prefix, subpath, query);
      input.navigate(path, false);
    },
    replace({ subpath, query }) {
      const path = buildPageUrl(prefix, subpath, query);
      input.navigate(path, true);
    },
  };
}

function buildPageUrl(
  prefix: string,
  subpath?: string,
  query?: Record<string, string>,
): string {
  let path = prefix;
  if (subpath) {
    path += `/${subpath.split('/').map(encodeURIComponent).join('/')}`;
  }
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    path += `?${params.toString()}`;
  }
  return path;
}

export type { PluginApiClient, PluginSlotRenderer };
