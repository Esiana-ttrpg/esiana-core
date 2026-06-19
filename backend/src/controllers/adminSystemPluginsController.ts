import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  validatePluginManifest,
  validatePluginRegistryEntry,
  PluginScopes,
  type PluginRegistryEntry,
} from '../lib/pluginManifest.js';
import { fetchAndParsePluginRegistry } from '../lib/fetchPluginRegistry.js';
import { parseTargetUrl } from '../lib/fetchPluginManifest.js';
import { installPluginFromRegistryEntry } from '../lib/pluginInstaller.js';
import { getOrCreateSystemSettings } from '../lib/systemSettings.js';
import {
  getSystemPluginById,
  listSystemPluginsByScope,
  registerGlobalPluginFromManifest,
  serializeSystemPlugin,
  updateSystemPluginConfig,
} from '../lib/systemPlugins.js';
import {
  listAvailableCampaignPlugins,
  registerCampaignPluginDefinition,
} from '../lib/campaignPlugins.js';
import {
  readManifestForRecord,
  reloadPluginHost,
  syncInstalledPluginEnabled,
  assertPluginCanEnable,
} from '../plugins/pluginManager.js';
import {
  collectAdminDiscoverablePluginEntries,
  mergeDiscoverablePluginEntries,
} from '../lib/bundledPlugins.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import {
  isPluginEngineMismatchError,
} from '../lib/plugins/pluginEngineMismatchError.js';

function parseConfigBody(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseRegistryEntryBody(body: unknown): PluginRegistryEntry | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const rawEntry = record.entry ?? body;
  const result = validatePluginRegistryEntry(rawEntry);
  return result.ok ? result.entry : null;
}

function enrichPluginWithRuntime(
  plugin: ReturnType<typeof serializeSystemPlugin>,
  installed?: {
    runtimeStatus: string;
    quarantineReason: string | null;
    quarantinedAt: Date | null;
    recentErrors: unknown;
    manifestChecksum: string;
    trustedInstall: boolean;
    commitSha: string;
  },
  runtimeManifest?: ReturnType<typeof readManifestForRecord>,
) {
  const isCampaignGenerator = runtimeManifest?.capabilities?.includes('campaignGenerator');
  const isDevelopmentProvider = runtimeManifest?.capabilities?.includes('developmentProvider');
  let adminDisplayLabel: string | undefined;
  if (isCampaignGenerator) {
    adminDisplayLabel = `${plugin.name} (Campaign generator — dev)`;
  } else if (isDevelopmentProvider) {
    adminDisplayLabel = `${plugin.name} (World Development provider)`;
  }

  const engines =
    runtimeManifest?.engines && Object.keys(runtimeManifest.engines).length
      ? runtimeManifest.engines
      : plugin.engines;
  const compatibility = runtimeManifest?.compatibility ?? plugin.compatibility;

  return {
    ...plugin,
    engines,
    ...(compatibility ? { compatibility } : {}),
    ...(adminDisplayLabel ? { adminDisplayLabel } : {}),
    runtimeStatus: installed?.runtimeStatus ?? 'active',
    quarantineReason: installed?.quarantineReason ?? null,
    quarantinedAt: installed?.quarantinedAt?.toISOString() ?? null,
    recentErrors: Array.isArray(installed?.recentErrors) ? installed.recentErrors : [],
    manifestChecksum: installed?.manifestChecksum ?? '',
    trustedInstall: installed?.trustedInstall ?? false,
    commitSha: installed?.commitSha ?? '',
  };
}

export async function listAdminPlugins(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const [globalPlugins, campaignCapabilities, campaignSystemRows] = await Promise.all([
    listSystemPluginsByScope(PluginScopes.GLOBAL),
    listAvailableCampaignPlugins(),
    listSystemPluginsByScope(PluginScopes.CAMPAIGN),
  ]);

  const campaignSystemById = new Map(campaignSystemRows.map((row) => [row.id, row]));

  const installedRows = await prisma.installedPlugin.findMany({
    where: {
      name: {
        in: [
          ...globalPlugins.map((plugin) => plugin.id),
          ...campaignCapabilities.map((plugin) => plugin.id),
        ],
      },
    },
  });
  const installedByName = new Map(installedRows.map((row) => [row.name, row]));

  res.json({
    hostCoreVersion: env.coreVersion,
    plugins: globalPlugins.map((plugin) => {
      const installed = installedByName.get(plugin.id);
      const serialized = serializeSystemPlugin(plugin);
      const runtimeManifest = installed ? readManifestForRecord(installed) : null;
      return enrichPluginWithRuntime(serialized, installed, runtimeManifest);
    }),
    campaignCapabilities: campaignCapabilities.map((capability) => {
      const installed = installedByName.get(capability.id);
      const runtimeManifest = installed ? readManifestForRecord(installed) : null;
      const systemRow = campaignSystemById.get(capability.id);
      const compatibility = runtimeManifest?.compatibility;
      return {
        ...capability,
        ...(compatibility ? { compatibility } : {}),
        installedAt: systemRow?.installedAt.toISOString(),
        updatedAt: systemRow?.updatedAt.toISOString(),
        runtimeStatus: installed?.runtimeStatus ?? 'active',
        quarantineReason: installed?.quarantineReason ?? null,
        quarantinedAt: installed?.quarantinedAt?.toISOString() ?? null,
        commitSha: installed?.commitSha ?? '',
        trustedInstall: installed?.trustedInstall ?? false,
        uiSlots: runtimeManifest?.uiSlots ?? capability.uiSlots,
      };
    }),
  });
}

export async function fetchAdminPluginRegistry(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const settings = await getOrCreateSystemSettings();
  const target = parseTargetUrl(settings.pluginRegistryUrl);

  const localDiscoverable = collectAdminDiscoverablePluginEntries();
  const warnings = [...localDiscoverable.warnings];
  let registryUrl = localDiscoverable.registryUrl;
  let plugins = localDiscoverable.plugins;

  if (target) {
    const fetched = await fetchAndParsePluginRegistry(target);
    if (fetched.ok) {
      registryUrl = target.toString();
      plugins = mergeDiscoverablePluginEntries(plugins, fetched.plugins);
    } else {
      warnings.push(`Remote registry unavailable: ${fetched.error}`);
    }
  } else {
    warnings.push('System plugin registry URL is not configured — showing on-disk and local catalog only.');
  }

  res.json({
    registryUrl,
    plugins,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}

export async function installAdminPluginFromRegistry(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const entry = parseRegistryEntryBody(req.body);
  if (!entry) {
    res.status(400).json({ error: 'Request body must include a valid registry entry object' });
    return;
  }

  try {
    const result = await installPluginFromRegistryEntry(entry);
    const plugin = await getSystemPluginById(result.systemPluginId);
    if (!plugin) {
      res.status(500).json({ error: 'Plugin installed but could not be loaded from database' });
      return;
    }

    res.status(201).json({
      plugin:
        plugin.scope === PluginScopes.GLOBAL
          ? serializeSystemPlugin(plugin)
          : { id: plugin.id, name: plugin.name, scope: plugin.scope },
      install: result,
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to install plugin from registry',
    });
  }
}

export async function reloadAdminPluginRuntime(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  await reloadPluginHost();
  res.json({ ok: true, message: 'Plugin runtime reloaded' });
}

export async function saveAdminPluginConfig(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const pluginId = req.params.pluginId;
  if (!pluginId || typeof pluginId !== 'string') {
    res.status(400).json({ error: 'Plugin id is required' });
    return;
  }

  const existing = await getSystemPluginById(pluginId);
  if (!existing || existing.scope !== PluginScopes.GLOBAL) {
    res.status(404).json({ error: 'Unknown global system plugin' });
    return;
  }

  const body = req.body as {
    config?: unknown;
    isEnabled?: unknown;
  };

  const config = parseConfigBody(body.config);
  if (!config) {
    res.status(400).json({ error: 'config must be a JSON object' });
    return;
  }

  const isEnabled =
    body.isEnabled === undefined
      ? undefined
      : typeof body.isEnabled === 'boolean'
        ? body.isEnabled
        : undefined;

  if (body.isEnabled !== undefined && isEnabled === undefined) {
    res.status(400).json({ error: 'isEnabled must be a boolean' });
    return;
  }

  if (isEnabled === true) {
    try {
      await assertPluginCanEnable(pluginId);
    } catch (err) {
      if (isPluginEngineMismatchError(err)) {
        res.status(409).json({ error: err.message, code: err.code });
        return;
      }
      throw err;
    }
  }

  const row = await updateSystemPluginConfig(pluginId, config, isEnabled);

  if (isEnabled !== undefined) {
    try {
      await syncInstalledPluginEnabled(pluginId, isEnabled);
    } catch (err) {
      if (isPluginEngineMismatchError(err)) {
        res.status(409).json({ error: err.message, code: err.code });
        return;
      }
      throw err;
    }
  }

  res.json({ plugin: serializeSystemPlugin(row) });
}

export async function registerAdminPluginManifest(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const body = req.body as { manifest?: unknown };
  const result = validatePluginManifest(body.manifest);

  if (!result.ok) {
    res.status(400).json({
      error: 'Invalid plugin manifest',
      details: result.errors,
    });
    return;
  }

  const row =
    result.manifest.scope === PluginScopes.CAMPAIGN
      ? await registerCampaignPluginDefinition(result.manifest)
      : await registerGlobalPluginFromManifest(result.manifest);

  res.status(201).json({
    plugin:
      row.scope === PluginScopes.GLOBAL
        ? serializeSystemPlugin(row)
        : { id: row.id, name: row.name, scope: row.scope },
  });
}
