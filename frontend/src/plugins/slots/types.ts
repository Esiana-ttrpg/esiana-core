/** Declarative UI slot ids (mirrors backend PluginUiSlots). */
import type { PluginApiClient } from '@/lib/pluginApiClient';
import type { PluginDomainEventDetail } from '@/lib/pluginDomainEvents';
import type { PluginPageRenderer } from '@/lib/pluginPages';
import type { LayoutWidget } from '@/lib/pluginPresentation';
import type { PluginSidebarSection } from '@/lib/pluginNavigation';
import type { PluginCharacterPageRenderer } from '@/lib/pluginCharacterPages';
import type {
  PluginPageTarget,
  PluginRegistrationScope,
  PluginRequires,
} from '@/lib/pluginContributions';

export const PluginUiSlots = {
  HEADER: 'header',
  SIDEBAR: 'sidebar',
  EDITOR: 'editor',
  DASHBOARD: 'dashboard',
  MAP_OVERLAY: 'map:overlay',
  MAP_TOOLBAR: 'map:toolbar',
  MAP_TOKEN_CONTEXT: 'map:token-context',
  CAMPAIGN_PLUGIN_SETTINGS: 'campaign-plugin-settings',
  APP_HOME: 'app-home',
  PAGE_EXTENSIONS: 'page-extensions',
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
  /** Current Core page extension target when mounted as a page section. */
  pageTarget?: PluginPageTarget;
  /** Wiki / entity page id when available. */
  pageId?: string;
  /** Entity surface key (e.g. character, location) when available. */
  surfaceKey?: string;
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
    scope?: PluginRegistrationScope;
  }): void;
  registerCharacterPageRenderer(definition: {
    key: string;
    render: PluginCharacterPageRenderer;
    exportToCanvas?: (
      context: Parameters<PluginCharacterPageRenderer>[1],
    ) => Promise<Array<Record<string, unknown>>>;
  }): void;
  registerSidebarItem(definition: {
    id: string;
    label: string;
    icon?: string;
    /** @deprecated Placement is Core/Settings-owned; remapped to plugins. */
    section?: PluginSidebarSection;
    pageId: string;
  }): void;
  registerAppHomeCard(definition: {
    id: string;
    render: PluginSlotRenderer;
    requires?: PluginRequires;
  }): void;
  registerHeaderPage(definition: {
    id: string;
    label: string;
    icon?: string;
    pageId: string;
    scope: PluginRegistrationScope;
    requires?: PluginRequires;
  }): void;
  registerPageSection(definition: {
    id: string;
    target: PluginPageTarget;
    render: PluginSlotRenderer;
    requires?: PluginRequires;
  }): void;
  registerPageAction(definition: {
    id: string;
    target: PluginPageTarget;
    label: string;
    icon?: string;
    pageId?: string;
    href?: string;
    requires?: PluginRequires;
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
