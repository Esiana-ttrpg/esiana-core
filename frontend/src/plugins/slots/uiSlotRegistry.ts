import {
  registerLayoutWidget,
  type LayoutWidget,
} from '@/lib/pluginPresentation';
import { registerPluginPage } from '@/lib/pluginPages';
import {
  registerPluginSidebarItem,
  type PluginSidebarSection,
} from '@/lib/pluginNavigation';
import {
  subscribeToPluginDomainEvent,
  type PluginDomainEventDetail,
} from '@/lib/pluginDomainEvents';
import type {
  PluginSlotRegistration,
  PluginUiRegistry,
  PluginUiSlotId,
  PluginSlotRenderer,
} from './types.js';

const slotRegistry = new Map<PluginUiSlotId, PluginSlotRegistration[]>();
const domainEventUnsubs = new Map<string, Array<() => void>>();

export function registerUiSlot(
  pluginId: string,
  slot: PluginUiSlotId,
  render?: PluginSlotRenderer,
  config: Record<string, unknown> = {},
): void {
  if (!render) return;
  const bucket = slotRegistry.get(slot) ?? [];
  bucket.push({ pluginId, slot, render, config });
  slotRegistry.set(slot, bucket);
}

export function getUiSlotRegistrations(slot: PluginUiSlotId): PluginSlotRegistration[] {
  return [...(slotRegistry.get(slot) ?? [])];
}

export function clearUiSlotRegistry(): void {
  slotRegistry.clear();
  for (const unsubs of domainEventUnsubs.values()) {
    for (const unsub of unsubs) unsub();
  }
  domainEventUnsubs.clear();
}

export function createPluginUiRegistry(
  pluginId: string,
  allowedSlots: PluginUiSlotId[] = [],
  config: Record<string, unknown> = {},
  campaignHandle?: string,
): PluginUiRegistry {
  return {
    registerSlot(slot: string, definition) {
      if (allowedSlots.length > 0 && !allowedSlots.includes(slot as PluginUiSlotId)) {
        throw new Error(
          `Plugin "${pluginId}" cannot register undeclared slot "${slot}"`,
        );
      }
      registerUiSlot(
        pluginId,
        slot as PluginUiSlotId,
        definition.render,
        config,
      );
    },
    registerDashboardWidget(definition) {
      registerLayoutWidget({
        ...definition,
        pluginId,
        slot: definition.slot ?? 'dashboard',
      } satisfies LayoutWidget);
    },
    registerPage(definition) {
      registerPluginPage(pluginId, definition);
    },
    registerSidebarItem(definition) {
      registerPluginSidebarItem(pluginId, definition);
    },
    subscribeToDomainEvent(pattern: string, handler: (detail: PluginDomainEventDetail) => void) {
      if (!campaignHandle) {
        console.warn(`[plugins] "${pluginId}" domain event subscription requires campaignHandle`);
        return () => undefined;
      }
      const unsub = subscribeToPluginDomainEvent(campaignHandle, pattern, handler);
      const bucket = domainEventUnsubs.get(pluginId) ?? [];
      bucket.push(unsub);
      domainEventUnsubs.set(pluginId, bucket);
      return unsub;
    },
  };
}

export type { PluginSidebarSection };
