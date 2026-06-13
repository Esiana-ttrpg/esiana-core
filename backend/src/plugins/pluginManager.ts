import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express, { type Express, type IRouter, type RequestHandler, Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { clearImportProviderRegistry } from '../lib/plugins/importProviderRegistry.js';
import { clearSearchCollectionRegistry } from '../lib/plugins/pluginSearchRegistry.js';
import {
  PluginScopes,
  isBackendOnlyGlobalPlugin,
  isDataOnlyContentPackPlugin,
  validatePluginManifest,
  type PluginManifest,
} from '../lib/pluginManifest.js';
import {
  attachPluginPlatformRoutes,
  createPluginHostContext,
  type PluginRegisterFn,
} from '../lib/plugins/pluginHostContext.js';
import { validatePluginEngines } from '../lib/plugins/pluginEngine.js';
import {
  clearInterceptorRegistry,
  setPluginHostReloader,
} from '../lib/pluginRuntime/index.js';
import { initializeDevelopmentRegistry } from '../lib/developmentRegistry.js';
import { clearWikiContentDecorators } from '../lib/plugins/wikiContentDecorators.js';
import {
  clearPublicPluginRouteRegistrars,
  listPublicPluginRouteRegistrars,
} from '../lib/plugins/publicPluginRoutes.js';
import { authenticateApiOrSession, requireAuth } from '../middleware/auth.js';

export interface RuntimePluginManifest {
  id?: string;
  name: string;
  version: string;
  githubUrl?: string;
  backendEntry: string;
  frontendEntry: string;
}

export interface LoadedPlugin {
  name: string;
  version: string;
  scope: string;
  permissions: string[];
  register?: PluginRegisterFn;
}

import {
  BLOCKED_ROUTE_PREFIXES,
  validatePluginRoutePath,
} from '../lib/plugins/pluginRouteGuard.js';
import { requirePluginCampaignJail, requireCampaignPluginEnabled } from '../lib/plugins/pluginCampaignJail.js';

let currentPluginRouter: RequestHandler = Router();
let currentPublicPluginRouter: RequestHandler = Router();
const manifestByPluginId = new Map<string, PluginManifest>();

function manifestPath(pluginDir: string): string {
  return path.join(pluginDir, 'manifest.json');
}

export function readRuntimeManifest(pluginDir: string): PluginManifest | null {
  const file = manifestPath(pluginDir);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as unknown;
    const result = validatePluginManifest(raw);
    if (!result.ok) return null;
    if (!isSyncableManifest(result.manifest)) return null;
    return result.manifest;
  } catch {
    return null;
  }
}

/** @deprecated Use readRuntimeManifest */
export function readManifest(pluginDir: string): RuntimePluginManifest | null {
  const manifest = readRuntimeManifest(pluginDir);
  if (!manifest?.backendEntry || !manifest.frontendEntry) return null;
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    githubUrl: manifest.githubUrl,
    backendEntry: manifest.backendEntry,
    frontendEntry: manifest.frontendEntry,
  };
}

export function resolvePluginRoot(record: {
  name: string;
  installPath: string;
}): string {
  if (record.installPath.trim()) {
    return path.join(env.pluginsDir, record.installPath);
  }
  return path.join(env.pluginsDir, record.name);
}

export function readManifestForRecord(record: {
  name: string;
  installPath: string;
}): PluginManifest | null {
  const cached = manifestByPluginId.get(record.name);
  if (cached) return cached;
  const pluginRoot = resolvePluginRoot(record);
  const manifest = readRuntimeManifest(pluginRoot);
  if (manifest) manifestByPluginId.set(record.name, manifest);
  return manifest;
}

export function mountPluginHost(app: Express): void {
  app.use('/api/plugin-runtime', authenticateApiOrSession, (req, res, next) => {
    currentPluginRouter(req, res, next);
  });
}

export function mountPublicPluginHost(app: Express): void {
  app.use('/api/public/plugin-runtime', (req, res, next) => {
    currentPublicPluginRouter(req, res, next);
  });
}

function rebuildPublicPluginRouter(): void {
  const hostRouter = Router();
  for (const entry of listPublicPluginRouteRegistrars()) {
    const pluginRouter = Router({ mergeParams: true });
    wrapRouterWithRouteGuard(pluginRouter, entry.pluginId);
    entry.register(pluginRouter);
    hostRouter.use(`/${encodeURIComponent(entry.pluginId)}`, pluginRouter);
  }
  currentPublicPluginRouter = hostRouter;
}

function wrapRouterWithRouteGuard(router: IRouter, pluginId: string): IRouter {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'use', 'all'] as const;
  for (const method of methods) {
    const original = router[method].bind(router) as (...args: unknown[]) => unknown;
    (router as unknown as Record<string, (...args: unknown[]) => unknown>)[method] = (
      ...args: unknown[]
    ) => {
      const pathArg = args[0];
      if (typeof pathArg === 'string') {
        validatePluginRoutePath(pluginId, pathArg);
      }
      return original(...args);
    };
  }
  return router;
}

function createGuardedRouter(pluginId: string, manifest: PluginManifest | null): IRouter {
  const router = Router({ mergeParams: true });
  wrapRouterWithRouteGuard(router, pluginId);

  router.use((req, res, next) => {
    const fullPath = req.baseUrl + req.path;
    for (const blocked of BLOCKED_ROUTE_PREFIXES) {
      if (fullPath.startsWith(blocked)) {
        res.status(403).json({
          error: `Plugin "${pluginId}" cannot register routes under ${blocked}`,
        });
        return;
      }
    }
    next();
  });

  if (manifest?.scope === PluginScopes.CAMPAIGN) {
    router.use(requireAuth);
    router.use(requirePluginCampaignJail);
    router.use(requireCampaignPluginEnabled(pluginId));
  } else {
    router.use(requireAuth);
  }

  return router;
}

async function importBackendEntry(
  pluginName: string,
  pluginRoot: string,
  backendEntry: string,
  manifest: PluginManifest | null,
): Promise<LoadedPlugin | null> {
  const entryPath = path.join(pluginRoot, backendEntry);

  if (!fs.existsSync(entryPath)) {
    console.warn(`[plugins] Missing backend entry: ${entryPath}`);
    return null;
  }

  const mod = (await import(pathToFileURL(entryPath).href)) as {
    default?: PluginRegisterFn;
    register?: PluginRegisterFn | ((app: Express) => void | Promise<void>);
  };

  const registerFn = mod.register ?? mod.default;
  if (typeof registerFn !== 'function') {
    console.warn(`[plugins] Plugin "${pluginName}" has no register export`);
    return null;
  }

  return {
    name: pluginName,
    version: manifest?.version ?? 'unknown',
    scope: manifest?.scope ?? PluginScopes.GLOBAL,
    permissions: manifest?.permissions ?? [],
    register: registerFn as PluginRegisterFn,
  };
}

const loadedPlugins = new Map<string, LoadedPlugin>();

export function getLoadedPlugins(): LoadedPlugin[] {
  return [...loadedPlugins.values()];
}

export function listAvailablePluginDirs(): string[] {
  if (!fs.existsSync(env.pluginsDir)) return [];

  const dirs: string[] = [];
  for (const entry of fs.readdirSync(env.pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;

    const topLevel = path.join(env.pluginsDir, entry.name);
    const topManifest = manifestPath(topLevel);
    if (fs.existsSync(topManifest)) {
      dirs.push(topLevel);
      continue;
    }

    for (const versionEntry of fs.readdirSync(topLevel, { withFileTypes: true })) {
      if (!versionEntry.isDirectory()) continue;
      const versionDir = path.join(topLevel, versionEntry.name);
      if (fs.existsSync(manifestPath(versionDir))) {
        dirs.push(versionDir);
      }
    }
  }

  return dirs;
}

function engineMismatch(manifest: PluginManifest | null): string | null {
  if (!manifest) return null;
  return validatePluginEngines(env.coreVersion, manifest.engines);
}

function isSyncableManifest(manifest: PluginManifest | null): manifest is PluginManifest {
  if (!manifest) return false;
  if (!manifest.backendEntry?.trim() && !isDataOnlyContentPackPlugin(manifest)) return false;
  if (!manifest.frontendEntry && !isBackendOnlyGlobalPlugin(manifest)) return false;
  return true;
}

function runtimeFrontendEntry(manifest: PluginManifest): string {
  return manifest.frontendEntry ?? '';
}

/**
 * Scan /plugins, upsert InstalledPlugin rows from manifest.json (disabled by default).
 */
export async function syncPluginCatalog(): Promise<number> {
  manifestByPluginId.clear();
  const dirs = listAvailablePluginDirs();
  let synced = 0;

  for (const dir of dirs) {
    const manifest = readRuntimeManifest(dir);
    if (!isSyncableManifest(manifest)) continue;

    const pluginId = manifest.id;
    manifestByPluginId.set(pluginId, manifest);
    const relativePath = path.relative(env.pluginsDir, dir).replace(/\\/g, '/');
    const installPath = relativePath;

    const mismatch = engineMismatch(manifest);
    const existing = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
    const isCampaignScope = manifest.scope === PluginScopes.CAMPAIGN;

    await prisma.installedPlugin.upsert({
      where: { name: pluginId },
      create: {
        name: pluginId,
        githubUrl: manifest.githubUrl ?? '',
        version: manifest.version,
        isEnabled: isCampaignScope,
        backendEntry: manifest.backendEntry ?? '',
        frontendEntry: runtimeFrontendEntry(manifest),
        installPath,
      },
      update: {
        githubUrl: manifest.githubUrl ?? '',
        version: manifest.version,
        backendEntry: manifest.backendEntry ?? '',
        frontendEntry: runtimeFrontendEntry(manifest),
        ...(installPath ? { installPath } : {}),
        ...(isCampaignScope ? { isEnabled: true } : {}),
        ...(mismatch && existing?.isEnabled ? { isEnabled: false } : {}),
      },
    });

    if (mismatch && existing?.isEnabled) {
      console.warn(`[plugins] Disabled "${pluginId}": ${mismatch}`);
      await prisma.systemPlugin.updateMany({
        where: { id: pluginId },
        data: { isEnabled: false },
      });
    }

    synced += 1;
  }

  return synced;
}

export async function reloadPluginHost(): Promise<void> {
  loadedPlugins.clear();
  clearInterceptorRegistry();
  clearWikiContentDecorators();
  clearPublicPluginRouteRegistrars();
  clearImportProviderRegistry();
  clearSearchCollectionRegistry();
  initializeDevelopmentRegistry();
  const hostRouter = Router();
  const installed = await prisma.installedPlugin.findMany({
    orderBy: { name: 'asc' },
  });

  for (const record of installed) {
    const manifest = readManifestForRecord(record);
    const hasPublicFeed = manifest?.permissions?.includes('feed:public') ?? false;
    const isCampaignScope = manifest?.scope === PluginScopes.CAMPAIGN;
    if (!isCampaignScope && !record.isEnabled && !hasPublicFeed) continue;

    const mismatch = engineMismatch(manifest);
    if (mismatch) {
      console.warn(`[plugins] Skipping "${record.name}": ${mismatch}`);
      if (record.isEnabled) {
        await prisma.installedPlugin.update({
          where: { name: record.name },
          data: { isEnabled: false },
        });
        await prisma.systemPlugin.updateMany({
          where: { id: record.name },
          data: { isEnabled: false },
        });
      }
      continue;
    }

    if (!record.backendEntry?.trim()) {
      continue;
    }

    const pluginRoot = resolvePluginRoot(record);
    const plugin = await importBackendEntry(
      record.name,
      pluginRoot,
      record.backendEntry,
      manifest,
    );
    if (!plugin?.register) continue;

    plugin.version = record.version;
    const shouldTrackLoaded = isCampaignScope || record.isEnabled;
    if (shouldTrackLoaded) {
      loadedPlugins.set(record.name, plugin);
    }

    const pluginRouter = createGuardedRouter(record.name, manifest);
    const context = createPluginHostContext(
      record.name,
      manifest?.permissions ?? [],
      pluginRoot,
      { scope: manifest?.scope ?? PluginScopes.GLOBAL },
    );

    try {
      await plugin.register(pluginRouter, context);
      attachPluginPlatformRoutes(
        pluginRouter,
        record.name,
        manifest?.permissions ?? [],
        pluginRoot,
        manifest?.scope ?? PluginScopes.GLOBAL,
      );
      const shouldMountRoutes = isCampaignScope || record.isEnabled;
      if (shouldMountRoutes) {
        hostRouter.use(`/${encodeURIComponent(record.name)}`, pluginRouter);
        console.log(`[plugins] Loaded: ${record.name}@${record.version}`);
      } else if (hasPublicFeed) {
        console.log(
          `[plugins] Registered public feed routes for disabled plugin "${record.name}"`,
        );
      }
    } catch (err) {
      console.error(`[plugins] Failed to register ${record.name}:`, err);
      if (record.isEnabled) {
        await prisma.installedPlugin.update({
          where: { name: record.name },
          data: { isEnabled: false },
        });
      }
    }
  }

  currentPluginRouter = hostRouter;
  rebuildPublicPluginRouter();
}

/** @deprecated Use reloadPluginHost */
export async function loadEnabledPlugins(_app: Express): Promise<void> {
  await reloadPluginHost();
}

export async function setPluginEnabled(
  name: string,
  isEnabled: boolean,
): Promise<void> {
  if (isEnabled) {
    const record = await prisma.installedPlugin.findUnique({ where: { name } });
    if (record) {
      const manifest = readManifestForRecord(record);
      const mismatch = engineMismatch(manifest);
      if (mismatch) {
        throw new Error(mismatch);
      }
    }
  }

  await prisma.installedPlugin.update({
    where: { name },
    data: { isEnabled },
  });
}

export async function syncInstalledPluginEnabled(
  pluginId: string,
  isEnabled: boolean,
): Promise<void> {
  const installed = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  if (!installed) return;
  await setPluginEnabled(pluginId, isEnabled);
  await reloadPluginHost();
}

export function getPluginManifest(pluginId: string): PluginManifest | undefined {
  return manifestByPluginId.get(pluginId);
}

/**
 * Reconcile SystemPlugin rows when on-disk manifest scope changed (e.g. global → campaign).
 */
export async function reconcileStaleSystemPluginsFromDisk(): Promise<number> {
  const dirs = listAvailablePluginDirs();
  let reconciled = 0;

  for (const dir of dirs) {
    const manifest = readRuntimeManifest(dir);
    if (!manifest || manifest.scope !== PluginScopes.CAMPAIGN) continue;

    const existing = await prisma.systemPlugin.findUnique({ where: { id: manifest.id } });
    if (!existing || existing.scope !== PluginScopes.GLOBAL) continue;

    const campaignSettings = await prisma.campaignPluginSetting.count({
      where: { pluginId: manifest.id },
    });

    if (campaignSettings === 0) {
      await prisma.systemPlugin.delete({ where: { id: manifest.id } });
    } else {
      await prisma.systemPlugin.update({
        where: { id: manifest.id },
        data: { scope: PluginScopes.CAMPAIGN, isEnabled: false },
      });
    }

    console.log(
      `[plugins] Reconciled stale global SystemPlugin row for campaign-scoped "${manifest.id}"`,
    );
    reconciled += 1;
  }

  return reconciled;
}

/**
 * Upsert campaign SystemPlugin rows from on-disk campaign-scope manifests.
 */
export async function syncCampaignPluginDefinitionsFromDisk(): Promise<number> {
  const { registerCampaignPluginDefinition } = await import('../lib/campaignPlugins.js');
  const dirs = listAvailablePluginDirs();
  let synced = 0;

  for (const dir of dirs) {
    const manifest = readRuntimeManifest(dir);
    if (!manifest || manifest.scope !== PluginScopes.CAMPAIGN) continue;
    await registerCampaignPluginDefinition(manifest);
    synced += 1;
  }

  return synced;
}

/**
 * Upsert global SystemPlugin rows from on-disk global-scope manifests.
 */
export async function syncGlobalSystemPluginsFromDisk(): Promise<number> {
  const { registerGlobalPluginFromManifest } = await import('../lib/systemPlugins.js');
  const dirs = listAvailablePluginDirs();
  let synced = 0;

  for (const dir of dirs) {
    const manifest = readRuntimeManifest(dir);
    if (!manifest || manifest.scope !== PluginScopes.GLOBAL) continue;
    await registerGlobalPluginFromManifest(manifest);
    synced += 1;
  }

  return synced;
}
