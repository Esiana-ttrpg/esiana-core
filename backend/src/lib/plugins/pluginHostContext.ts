import { Router, type IRouter } from 'express';
import {
  emitPluginDomainEvent,
  subscribeToDomainEvent,
  type DomainEventListener,
} from '../domainEvents/index.js';
import {
  registerDataInterceptor,
  type DataInterceptorDefinition,
} from '../pluginRuntime/index.js';
import { registerStorageProvider } from '../storage/storageRegistry.js';
import type { StorageDriverFactory } from '../storage/types.js';
import {
  createPluginDataService,
  type PluginDataApi,
  type PluginDataService,
} from './pluginDataService.js';
import { registerPublicPluginRoutes } from './publicPluginRoutes.js';
import { PluginScopes } from '../pluginManifest.js';
import { prisma } from '../prisma.js';
import {
  getCampaignPluginUserConfig,
  isCampaignPluginEnabled,
} from '../campaignPlugins.js';
import {
  buildOpdsCatalogFeed,
  type OpdsAtomFeed,
} from '../opds/atom.js';
import {
  getPublicWikiPage,
  listPublicWikiPages,
  publicWikiPageToMarkdown,
  resolvePublicCampaignByHandle,
  resolvePublicPagePath,
  type PublicWikiPageRecord,
} from './publicWikiRead.js';
import {
  allowsAnonymousCampaignView,
  resolveDiscoverability,
} from '../../../../shared/campaignPolicy/discoverability.js';
import type { PublicPagePath } from '../../../../shared/publicPagePath.js';
import {
  registerWikiContentDecorator,
  type WikiContentDecoratorFn,
} from './wikiContentDecorators.js';
import {
  registerDevelopmentProvider,
  registerEligibilityProvider,
  registerRationaleProvider,
  registerDevelopmentResolveProvider,
} from '../developmentRegistry.js';
import type {
  DevelopmentProvider,
  EligibilityProvider,
  RationaleProvider,
  DevelopmentResolveProvider,
} from '../../../../shared/developmentProvider.js';
import {
  createPluginHostServices,
  type PluginCalendarApi,
  type PluginConfigApi,
  type PluginEventsApi,
  type PluginLoreApi,
  type PluginMapsApi,
  type PluginPartyApi,
  type PluginSecretsApi,
  type PluginTimelineApi,
  type PluginWorldApi,
} from './pluginHostServices.js';
import {
  registerImportProvider as registerImportProviderEntry,
  type ImportProviderDefinition,
} from './importProviderRegistry.js';
import {
  registerSearchCollection as registerSearchCollectionEntry,
  type PluginSearchCollectionDefinition,
} from './pluginSearchRegistry.js';
import {
  assertPluginAssetQuota,
  buildPluginAssetDisplayName,
  buildPluginAssetUri,
  uploadPluginAsset,
} from './pluginAssetsService.js';
import { mountPluginPlatformRoutes } from './pluginPlatformRoutes.js';
import { requirePluginCampaignJail } from './pluginCampaignJail.js';
import { requireAuth } from '../../middleware/auth.js';

export type { WikiContentDecoratorFn };

export interface PublicWikiHostApi {
  resolveCampaignByHandle(handle: string): ReturnType<typeof resolvePublicCampaignByHandle>;
  listPublicPages(campaignId: string): Promise<PublicWikiPageRecord[]>;
  getPublicPage(campaignId: string, pageId: string): Promise<PublicWikiPageRecord | null>;
  pageToMarkdown(page: PublicWikiPageRecord): string;
  /** Browser navigation path (`/campaigns/:handle/characters/...`) — not an API URL. */
  resolvePublicPagePath(
    campaignHandle: string,
    page: Pick<
      PublicWikiPageRecord,
      'id' | 'title' | 'parentId' | 'templateType' | 'workspace' | 'pathKey' | 'metadata'
    >,
  ): PublicPagePath;
}

export interface FeedsHostApi {
  buildOpdsAtom(feed: OpdsAtomFeed): string;
}

export interface PluginHostContext {
  pluginId: string;
  scope: string;
  manifestPermissions: string[];
  /** Set for campaign-scoped plugins — jails plugin data writes. */
  jailedCampaignId?: string;
  registerStorageProvider(providerId: string, factory: StorageDriverFactory): void;
  createPluginDataService(campaignId?: string): PluginDataService;
  /** Campaign-scoped JSON state (requires plugin:data + campaign jail). */
  data: PluginDataApi;
  calendar: PluginCalendarApi;
  timeline: PluginTimelineApi;
  party: PluginPartyApi;
  world: PluginWorldApi;
  lore: PluginLoreApi;
  maps: PluginMapsApi;
  config: PluginConfigApi;
  secrets: PluginSecretsApi;
  events: PluginEventsApi;
  registerDataInterceptor(definition: DataInterceptorDefinition): void;
  onDomainEvent(pattern: string, listener: DomainEventListener): () => void;
  /** Alias for onDomainEvent. */
  emitDomainEvent(
    type: string,
    payload: Record<string, unknown>,
    campaignId?: string,
  ): void;
  /** Register unauthenticated read-only routes (requires feed:public permission). */
  registerPublicRoutes(registerFn: (router: IRouter) => void): void;
  isEnabledForCampaign(campaignId: string): Promise<boolean>;
  getCampaignConfig(campaignId: string): Promise<Record<string, unknown>>;
  /** Public wiki read API (requires wiki:read-public permission). */
  publicWiki: PublicWikiHostApi;
  /** Feed serialization helpers (requires feed:opds permission). */
  feeds: FeedsHostApi;
  /** Read-path wiki decoration (requires wiki:decorate permission). */
  registerWikiContentDecorator(fn: WikiContentDecoratorFn): void;
  /** World Development candidate provider (requires world-development:provider). */
  registerDevelopmentProvider(provider: DevelopmentProvider): void;
  registerEligibilityProvider(provider: EligibilityProvider): void;
  registerRationaleProvider(provider: RationaleProvider): void;
  registerDevelopmentResolveProvider(provider: DevelopmentResolveProvider): void;
  registerImportProvider(definition: Omit<ImportProviderDefinition, 'id'> & { id: string }): void;
  registerSearchCollection(definition: PluginSearchCollectionDefinition): void;
  assets: {
    buildUri(assetId: string): string;
    buildDisplayName(label: string): string;
    assertQuota(campaignId: string): Promise<void>;
    upload(
      file: { buffer: Buffer; contentType: string; label?: string },
      campaignId?: string,
    ): Promise<{ assetId: string; uri: string }>;
  };
}

function assertPermission(
  pluginId: string,
  permissions: string[],
  permission: string,
): void {
  if (!permissions.includes(permission)) {
    throw new Error(`Plugin "${pluginId}" lacks ${permission} permission`);
  }
}

function createPublicWikiApi(
  pluginId: string,
  permissions: string[],
): PublicWikiHostApi {
  return {
    async resolveCampaignByHandle(handle: string) {
      assertPermission(pluginId, permissions, 'wiki:read-public');
      const campaign = await resolvePublicCampaignByHandle(handle);
      if (
        !campaign ||
        !allowsAnonymousCampaignView(resolveDiscoverability(campaign.discoverability))
      ) {
        return null;
      }
      return campaign;
    },
    listPublicPages(campaignId: string) {
      assertPermission(pluginId, permissions, 'wiki:read-public');
      return listPublicWikiPages(campaignId);
    },
    getPublicPage(campaignId: string, pageId: string) {
      assertPermission(pluginId, permissions, 'wiki:read-public');
      return getPublicWikiPage(campaignId, pageId);
    },
    pageToMarkdown(page: PublicWikiPageRecord) {
      assertPermission(pluginId, permissions, 'wiki:read-public');
      return publicWikiPageToMarkdown(page);
    },
    resolvePublicPagePath(campaignHandle, page) {
      assertPermission(pluginId, permissions, 'wiki:read-public');
      return resolvePublicPagePath(campaignHandle, page);
    },
  };
}

function createFeedsApi(pluginId: string, permissions: string[]): FeedsHostApi {
  return {
    buildOpdsAtom(feed: OpdsAtomFeed) {
      assertPermission(pluginId, permissions, 'feed:opds');
      return buildOpdsCatalogFeed(feed);
    },
  };
}

export function createPluginHostContext(
  pluginId: string,
  manifestPermissions: string[] = [],
  pluginRoot = '',
  options: { jailedCampaignId?: string; scope?: string } = {},
): PluginHostContext {
  const scope = options.scope ?? PluginScopes.GLOBAL;
  const jailedCampaignId = options.jailedCampaignId;

  const createDataService = (requestedCampaignId?: string): PluginDataService => {
    if (!manifestPermissions.includes('plugin:data')) {
      throw new Error(`Plugin "${pluginId}" lacks plugin:data permission`);
    }
    const campaignId = jailedCampaignId ?? requestedCampaignId;
    if (!campaignId) {
      throw new Error('campaignId is required for plugin data access');
    }
    if (jailedCampaignId && requestedCampaignId && requestedCampaignId !== jailedCampaignId) {
      throw new Error(
        `Plugin "${pluginId}" cannot access campaign "${requestedCampaignId}" outside its jail`,
      );
    }
    return createPluginDataService(pluginId, campaignId);
  };

  const dataService: PluginDataApi = {
    get(key: string) {
      return createDataService(jailedCampaignId).get(key);
    },
    set(key: string, value: Parameters<PluginDataService['set']>[1]) {
      return createDataService(jailedCampaignId).set(key, value);
    },
    delete(key: string) {
      return createDataService(jailedCampaignId).delete(key);
    },
    listKeys() {
      return createDataService(jailedCampaignId).listKeys();
    },
  };

  const services = createPluginHostServices({
    pluginId,
    permissions: manifestPermissions,
    jailedCampaignId,
    data: dataService,
    subscribeToDomainEvent,
  });

  return {
    pluginId,
    scope,
    manifestPermissions,
    jailedCampaignId,
    publicWiki: createPublicWikiApi(pluginId, manifestPermissions),
    feeds: createFeedsApi(pluginId, manifestPermissions),
    ...services,
    registerStorageProvider(providerId: string, factory: StorageDriverFactory) {
      if (!manifestPermissions.includes('storage:provider')) {
        throw new Error(
          `Plugin "${pluginId}" lacks storage:provider permission to register "${providerId}"`,
        );
      }
      registerStorageProvider(providerId, factory, {
        displayName: providerId,
        version: 'plugin',
        resolveConfig: () => ({}),
        capabilities: {},
      });
    },
    createPluginDataService(requestedCampaignId?: string) {
      return createDataService(requestedCampaignId);
    },
    registerDataInterceptor(definition: DataInterceptorDefinition) {
      if (!manifestPermissions.includes('data:interceptor')) {
        throw new Error(`Plugin "${pluginId}" lacks data:interceptor permission`);
      }
      if (!pluginRoot) {
        throw new Error('Plugin root path is required to register data interceptors');
      }
      registerDataInterceptor(pluginId, pluginRoot, definition);
    },
    onDomainEvent(pattern: string, listener: DomainEventListener) {
      return subscribeToDomainEvent(pattern, listener);
    },
    emitDomainEvent(type: string, payload: Record<string, unknown>, campaignId?: string) {
      emitPluginDomainEvent(pluginId, type, payload, campaignId);
    },
    registerPublicRoutes(registerFn: (router: IRouter) => void) {
      if (!manifestPermissions.includes('feed:public')) {
        throw new Error(`Plugin "${pluginId}" lacks feed:public permission`);
      }
      registerPublicPluginRoutes(pluginId, registerFn);
    },
    async isEnabledForCampaign(campaignId: string): Promise<boolean> {
      if (scope === PluginScopes.CAMPAIGN) {
        return isCampaignPluginEnabled(campaignId, pluginId);
      }
      const installed = await prisma.installedPlugin.findUnique({
        where: { name: pluginId },
        select: { isEnabled: true },
      });
      if (!installed?.isEnabled) return false;
      const system = await prisma.systemPlugin.findUnique({
        where: { id: pluginId },
        select: { isEnabled: true },
      });
      return Boolean(system?.isEnabled);
    },
    getCampaignConfig(campaignId: string) {
      if (scope !== PluginScopes.CAMPAIGN) {
        return Promise.resolve({});
      }
      return getCampaignPluginUserConfig(campaignId, pluginId);
    },
    registerWikiContentDecorator(fn: WikiContentDecoratorFn) {
      if (!manifestPermissions.includes('wiki:decorate')) {
        throw new Error(`Plugin "${pluginId}" lacks wiki:decorate permission`);
      }
      registerWikiContentDecorator(pluginId, fn);
    },
    registerDevelopmentProvider(provider: DevelopmentProvider) {
      assertPermission(pluginId, manifestPermissions, 'world-development:provider');
      if (provider.id !== pluginId) {
        throw new Error(
          `Plugin "${pluginId}" development provider id must match plugin id "${pluginId}"`,
        );
      }
      registerDevelopmentProvider(provider);
    },
    registerEligibilityProvider(provider: EligibilityProvider) {
      assertPermission(pluginId, manifestPermissions, 'world-development:provider');
      registerEligibilityProvider(provider);
    },
    registerRationaleProvider(provider: RationaleProvider) {
      assertPermission(pluginId, manifestPermissions, 'world-development:provider');
      registerRationaleProvider(provider);
    },
    registerDevelopmentResolveProvider(provider: DevelopmentResolveProvider) {
      assertPermission(pluginId, manifestPermissions, 'world-development:provider');
      registerDevelopmentResolveProvider(provider);
    },
    registerImportProvider(definition) {
      assertPermission(pluginId, manifestPermissions, 'campaign:import');
      registerImportProviderEntry(pluginId, definition);
    },
    registerSearchCollection(definition) {
      registerSearchCollectionEntry(pluginId, definition);
    },
    assets: {
      buildUri: buildPluginAssetUri,
      buildDisplayName(label: string) {
        return buildPluginAssetDisplayName(pluginId, label);
      },
      assertQuota(campaignId: string) {
        return assertPluginAssetQuota(pluginId, campaignId);
      },
      upload(file, requestedCampaignId) {
        assertPermission(pluginId, manifestPermissions, 'plugin:assets');
        const campaignId = jailedCampaignId ?? requestedCampaignId;
        if (!campaignId) {
          throw new Error('campaignId is required for plugin asset upload');
        }
        if (jailedCampaignId && requestedCampaignId && requestedCampaignId !== jailedCampaignId) {
          throw new Error(`Plugin "${pluginId}" cannot upload outside its campaign jail`);
        }
        return uploadPluginAsset({
          pluginId,
          campaignId,
          buffer: file.buffer,
          contentType: file.contentType,
          label: file.label,
        });
      },
    },
  };
}

export type PluginRegisterFn = (
  router: IRouter,
  context: PluginHostContext,
) => void | Promise<void>;

/** Mount standard campaign read routes on a plugin router (requires campaign jail per request). */
export function attachPluginPlatformRoutes(
  router: IRouter,
  pluginId: string,
  manifestPermissions: string[],
  pluginRoot: string,
  scope: string,
): void {
  const platformRouter = Router({ mergeParams: true });
  platformRouter.use(requireAuth);
  platformRouter.use(requirePluginCampaignJail);
  mountPluginPlatformRoutes(platformRouter, (campaignId) =>
    createPluginHostContext(pluginId, manifestPermissions, pluginRoot, {
      jailedCampaignId: campaignId,
      scope,
    }),
  );
  router.use(platformRouter);
}

