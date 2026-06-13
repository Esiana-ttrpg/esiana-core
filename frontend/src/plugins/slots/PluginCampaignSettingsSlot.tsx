import { useEffect, useRef } from 'react';
import { loadFrontendPlugin } from '@/plugins/pluginRegistry';
import { enrichPluginSlotContext, createBasePluginSlotContext } from '@/lib/pluginSlotContext';
import { createPluginUiRegistry } from './uiSlotRegistry';
import type { PluginSlotRenderer, PluginUiSlotId } from './types';

const CAMPAIGN_PLUGIN_SETTINGS_SLOT: PluginUiSlotId = 'campaign-plugin-settings';

export function PluginCampaignSettingsSlot({
  pluginId,
  frontendEntry,
  campaignId,
  campaignHandle,
  config,
  isEnabled,
  uiSlots,
  apiBase,
}: {
  pluginId: string;
  frontendEntry: string;
  campaignId: string;
  campaignHandle: string;
  config: Record<string, unknown>;
  isEnabled: boolean;
  uiSlots: string[];
  apiBase: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !uiSlots.includes(CAMPAIGN_PLUGIN_SETTINGS_SLOT)) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const mod = await loadFrontendPlugin(pluginId, frontendEntry, campaignId);
      if (cancelled || !mod?.register) return;

      let renderer: PluginSlotRenderer | undefined;
      const registry = createPluginUiRegistry(
        pluginId,
        [CAMPAIGN_PLUGIN_SETTINGS_SLOT],
        config,
        campaignHandle,
      );
      const originalRegisterSlot = registry.registerSlot.bind(registry);
      registry.registerSlot = (slot, definition) => {
        originalRegisterSlot(slot, definition);
        if (slot === CAMPAIGN_PLUGIN_SETTINGS_SLOT && definition.render) {
          renderer = definition.render;
        }
      };

      await mod.register(registry);
      if (cancelled || !renderer) return;

      const slotContext = enrichPluginSlotContext(
        createBasePluginSlotContext({
          campaignId,
          campaignHandle,
          config,
          isEnabled,
          apiBase,
        }),
        pluginId,
      );

      const result = await renderer(root, slotContext);
      if (typeof result === 'function') {
        cleanup = result;
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      root.replaceChildren();
    };
  }, [
    pluginId,
    frontendEntry,
    campaignId,
    campaignHandle,
    config,
    isEnabled,
    uiSlots,
    apiBase,
  ]);

  if (!uiSlots.includes(CAMPAIGN_PLUGIN_SETTINGS_SLOT)) {
    return null;
  }

  return <div ref={rootRef} className="esiana-plugin-slot esiana-plugin-settings" />;
}
