/** Declarative UI slot ids (mirrors backend PluginUiSlots). */
import type { PluginApiClient } from '@/lib/pluginApiClient';
import type { PluginDomainEventDetail } from '@/lib/pluginDomainEvents';
import type { PluginPageRenderer } from '@/lib/pluginPages';
import type {
  DashboardWidgetConfig,
  DashboardWidgetSettingsRenderer,
  LayoutWidget,
} from '@/lib/pluginPresentation';
import type { PluginSidebarSection } from '@/lib/pluginNavigation';

export const PluginUiSlots = {
  HEADER: 'header',
  SIDEBAR: 'sidebar',
  EDITOR: 'editor',
  DASHBOARD: 'dashboard',
  MAP_OVERLAY: 'map:overlay',
  MAP_TOOLBAR: 'map:toolbar',
  MAP_TOKEN_CONTEXT: 'map:token-context',
  CAMPAIGN_PLUGIN_SETTINGS: 'campaign-plugin-settings',
} as const;

export type PluginUiSlotId = (typeof PluginUiSlots)[keyof typeof PluginUiSlots];

export interface PluginSlotContext {
  pluginId: string;
  campaignId?: string;
  campaignHandle?: string;
  config: Record<string, unknown>;
  api: PluginApiClient;
  /** Campaign plugin settings panel — whether the plugin is enabled for this campaign. */
  isEnabled?: boolean;
  /** API origin for building public plugin URLs in settings panels. */
  apiBase?: string;
  /** Map canvas slot context (when applicable). */
  map?: {
    mapId: string;
    mapTitle: string;
    canEdit: boolean;
  };
  /** Selected map pin (token-context slot). */
  pin?: {
    id: string;
    title: string;
    pinType: string;
  };
}

export type PluginSlotContextBase = Omit<PluginSlotContext, 'pluginId' | 'api'>;

export type PluginSlotCleanup = void | (() => void);

export type PluginSlotRenderer = (
  root: HTMLElement,
  context: PluginSlotContext,
) => PluginSlotCleanup | Promise<PluginSlotCleanup>;

export interface PluginSlotRegistration {
  pluginId: string;
  slot: PluginUiSlotId;
  config: Record<string, unknown>;
  render?: PluginSlotRenderer;
}

export interface FrontendPluginDescriptor {
  id: string;
  name: string;
  scope: string;
  version: string;
  frontendEntry: string;
  uiSlots: PluginUiSlotId[];
  config: Record<string, unknown>;
  runtimeStatus?: 'active' | 'quarantined';
  quarantineReason?: string | null;
  trustedInstall?: boolean;
  cspExtensions?: {
    connectSrc?: string[];
    imgSrc?: string[];
  };
}

export interface PluginUiRegistry {
  registerSlot(
    slot: string,
    definition: {
      render?: PluginSlotRenderer;
    },
  ): void;
  registerDashboardWidget(definition: Omit<LayoutWidget, 'pluginId' | 'slot'> & { slot?: string }): void;
  registerPage(definition: {
    id: string;
    title: string;
    render?: PluginPageRenderer;
  }): void;
  registerSidebarItem(definition: {
    id: string;
    label: string;
    icon?: string;
    section: PluginSidebarSection;
    pageId: string;
  }): void;
  subscribeToDomainEvent(
    pattern: string,
    handler: (detail: PluginDomainEventDetail) => void,
  ): () => void;
}

export interface PluginFrontendModule {
  id: string;
  name: string;
  register?: (registry: PluginUiRegistry) => void | Promise<void>;
  /** Legacy imperative mount API. */
  mount?: (root: HTMLElement) => void | Promise<void>;
}
