import { env } from '../../config/env.js';
import { prisma } from '../prisma.js';
import { listAvailablePluginDirs, readRuntimeManifest } from '../../plugins/pluginManager.js';
import { S3_COMPATIBLE_PROVIDER_ID } from './storageProviderConfig.js';

export const REMOTE_OBJECT_STORAGE_PLUGIN_ID = 'remote-object-storage';

const ACTIVE_PROVIDER_PLUGIN_IDS: Record<string, string> = {
  [S3_COMPATIBLE_PROVIDER_ID]: REMOTE_OBJECT_STORAGE_PLUGIN_ID,
};

function pluginManifestOnDisk(pluginId: string): boolean {
  for (const dir of listAvailablePluginDirs()) {
    const manifest = readRuntimeManifest(dir);
    if (manifest?.id === pluginId) return true;
  }
  return false;
}

/**
 * When STORAGE_PROVIDER requires a community infra plugin, auto-enable it if present on disk.
 */
export async function ensureStorageProviderPluginReady(): Promise<void> {
  const pluginId = ACTIVE_PROVIDER_PLUGIN_IDS[env.storageProvider];
  if (!pluginId || !pluginManifestOnDisk(pluginId)) return;

  const installed = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  const system = await prisma.systemPlugin.findUnique({ where: { id: pluginId } });

  if (installed?.isEnabled && system?.isEnabled) return;

  if (installed && !installed.isEnabled) {
    await prisma.installedPlugin.update({
      where: { name: pluginId },
      data: { isEnabled: true },
    });
  }

  if (system && !system.isEnabled) {
    await prisma.systemPlugin.update({
      where: { id: pluginId },
      data: { isEnabled: true },
    });
  }

  console.log(
    `[storage] Auto-enabled "${pluginId}" because STORAGE_PROVIDER=${env.storageProvider}`,
  );
}
