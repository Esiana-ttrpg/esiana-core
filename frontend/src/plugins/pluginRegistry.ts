/**
 * Frontend plugin loader — dynamic import from host-served plugin assets.
 */

import {
  clearUiSlotRegistry,
  createPluginUiRegistry,
  type FrontendPluginDescriptor,
  type PluginFrontendModule,
  type PluginUiSlotId,
} from './slots';
import { clearPluginPresentationRegistry } from '@/lib/pluginPresentation';
import { clearPluginNavigationRegistry } from '@/lib/pluginNavigation';
import { clearPluginPageRegistry } from '@/lib/pluginPages';

const loadedModules = new Map<string, PluginFrontendModule>();

function buildPluginAssetUrl(
  pluginId: string,
  frontendEntry: string,
  campaignId?: string,
): string {
  const normalized = frontendEntry.replace(/^(\.\/)+/, '');
  const segments = normalized.split('/').map((part) => encodeURIComponent(part));
  const query = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  return `/api/plugin-assets/${encodeURIComponent(pluginId)}/${segments.join('/')}${query}`;
}

function normalizeFrontendModule(
  pluginId: string,
  mod: Record<string, unknown>,
): PluginFrontendModule {
  return {
    id: pluginId,
    name: typeof mod.name === 'string' ? mod.name : pluginId,
    register:
      typeof mod.register === 'function'
        ? (mod.register as PluginFrontendModule['register'])
        : undefined,
    mount:
      typeof mod.mount === 'function'
        ? (mod.mount as PluginFrontendModule['mount'])
        : undefined,
  };
}

export async function loadFrontendPlugin(
  pluginId: string,
  frontendEntry: string,
  campaignId?: string,
): Promise<PluginFrontendModule | null> {
  if (loadedModules.has(pluginId)) {
    return loadedModules.get(pluginId)!;
  }

  const url = buildPluginAssetUrl(pluginId, frontendEntry, campaignId);

  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      const detail = response.headers.get('content-type')?.includes('json')
        ? JSON.stringify(await response.json())
        : await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${detail}`);
    }

    const source = await response.text();
    const blob = new Blob([source], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      const mod = (await import(/* @vite-ignore */ blobUrl)) as Record<string, unknown>;
      const entry = normalizeFrontendModule(pluginId, mod);
      loadedModules.set(pluginId, entry);
      return entry;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error(`[plugins] Failed to load frontend module "${pluginId}"`, error);
    return null;
  }
}

export function registerFrontendPlugin(
  name: string,
  module: PluginFrontendModule,
): void {
  loadedModules.set(name, module);
}

export function getFrontendPlugin(name: string): PluginFrontendModule | undefined {
  return loadedModules.get(name);
}

export function listFrontendPlugins(): string[] {
  return [...loadedModules.keys()];
}

export async function bootstrapFrontendPlugins(
  descriptors: FrontendPluginDescriptor[],
  context: {
    campaignId?: string;
    campaignHandle?: string;
  },
): Promise<void> {
  clearUiSlotRegistry();
  clearPluginPresentationRegistry();
  clearPluginNavigationRegistry();
  clearPluginPageRegistry();

  for (const descriptor of descriptors) {
    const mod = await loadFrontendPlugin(
      descriptor.id,
      descriptor.frontendEntry,
      context.campaignId,
    );
    if (!mod) continue;

    if (mod.register) {
      const registry = createPluginUiRegistry(
        descriptor.id,
        descriptor.uiSlots as PluginUiSlotId[],
        descriptor.config,
        context.campaignHandle,
      );
      await mod.register(registry);
      continue;
    }

    if (mod.mount && descriptor.uiSlots.includes('sidebar')) {
      const registry = createPluginUiRegistry(
        descriptor.id,
        descriptor.uiSlots,
        descriptor.config,
      );
      registry.registerSlot('sidebar', {
        render(root, slotContext) {
          void mod.mount?.(root);
          root.dataset.campaignHandle = slotContext.campaignHandle ?? '';
          return undefined;
        },
      });
    }
  }
}

export function resetFrontendPluginLoader(): void {
  loadedModules.clear();
  clearUiSlotRegistry();
  clearPluginPresentationRegistry();
  clearPluginNavigationRegistry();
  clearPluginPageRegistry();
}
