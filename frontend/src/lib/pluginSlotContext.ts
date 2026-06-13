import type { PluginApiClient } from '@/lib/pluginApiClient';
import { createPluginApiClient } from '@/lib/pluginApiClient';
import type { PluginSlotContext } from '@/plugins/slots/types';

export function enrichPluginSlotContext(
  base: Omit<PluginSlotContext, 'pluginId' | 'api'>,
  pluginId: string,
): PluginSlotContext {
  return {
    ...base,
    pluginId,
    api: createPluginApiClient({
      pluginId,
      campaignHandle: base.campaignHandle,
    }),
  };
}

export function createBasePluginSlotContext(input: {
  campaignId?: string;
  campaignHandle?: string;
  config?: Record<string, unknown>;
  isEnabled?: boolean;
  apiBase?: string;
}): Omit<PluginSlotContext, 'pluginId' | 'api'> {
  return {
    campaignId: input.campaignId,
    campaignHandle: input.campaignHandle,
    config: input.config ?? {},
    isEnabled: input.isEnabled,
    apiBase: input.apiBase,
  };
}

export type { PluginApiClient };
