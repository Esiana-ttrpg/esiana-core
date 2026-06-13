import { prisma } from '../prisma.js';
import { reloadPluginHost } from '../../plugins/pluginManager.js';
import { parseUninstallPolicy } from './pluginManifestExtras.js';
import { readManifestForRecord, resolvePluginRoot } from '../../plugins/pluginManager.js';
import fs from 'node:fs';
import path from 'node:path';
import { rm } from 'node:fs/promises';
import { deleteAllPluginSecrets } from './pluginSecretsService.js';
import { deletePluginAssets } from './pluginAssetsService.js';

export async function uninstallPlugin(pluginId: string): Promise<void> {
  const record = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  if (!record) {
    throw new Error(`Plugin "${pluginId}" is not installed`);
  }

  const manifest = readManifestForRecord(record);
  const uninstallPolicy = parseUninstallPolicy(
    manifest && 'uninstallPolicy' in manifest
      ? (manifest as { uninstallPolicy?: string }).uninstallPolicy
      : undefined,
  );

  if (uninstallPolicy === 'removePluginData') {
    await prisma.pluginData.deleteMany({ where: { pluginId } });
    await prisma.campaignPluginSetting.deleteMany({ where: { pluginId } });
    await deleteAllPluginSecrets(pluginId);
    await deletePluginAssets(pluginId);
  }

  await prisma.systemPlugin.deleteMany({ where: { id: pluginId } });

  const pluginRoot = resolvePluginRoot(record);
  if (fs.existsSync(pluginRoot)) {
    await rm(pluginRoot, { recursive: true, force: true });
  }

  await prisma.installedPlugin.delete({ where: { name: pluginId } });
  await reloadPluginHost();
}

export async function loadConfigSchemaFromDisk(pluginRoot: string): Promise<Record<string, unknown> | undefined> {
  const schemaPath = path.join(pluginRoot, 'config-schema.json');
  if (!fs.existsSync(schemaPath)) return undefined;
  try {
    const raw = JSON.parse(await fs.promises.readFile(schemaPath, 'utf-8')) as unknown;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function mergeManifestWithDiskSchema(
  pluginRoot: string,
  manifest: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const diskSchema = await loadConfigSchemaFromDisk(pluginRoot);
  if (!diskSchema) return manifest;
  return {
    ...manifest,
    configSchema: manifest.configSchema ?? diskSchema,
  };
}
