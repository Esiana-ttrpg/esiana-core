export {
  PluginUiSlots,
  type PluginUiSlotId,
  type PluginSlotContext,
  type PluginSlotRegistration,
  type FrontendPluginDescriptor,
  type PluginFrontendModule,
  type PluginUiRegistry,
} from './types.js';

export {
  registerUiSlot,
  getUiSlotRegistrations,
  clearUiSlotRegistry,
  createPluginUiRegistry,
} from './uiSlotRegistry.js';

export { PluginErrorBoundary } from './PluginErrorBoundary.js';
export { PluginSlotHost } from './PluginSlotHost.js';
export { PluginCampaignSettingsSlot } from './PluginCampaignSettingsSlot.js';
