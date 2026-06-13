import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import * as tar from 'tar';
import { env } from '../config/env.js';
import { registerCampaignPluginDefinition } from './campaignPlugins.js';
import { fetchAndValidateManifestFromUrl, parseTargetUrl } from './fetchPluginManifest.js';
import {
  isBackendOnlyGlobalPlugin,
  isDataOnlyContentPackPlugin,
  isRegistryEntryInstallable,
  PluginScopes,
  registryEntryToManifest,
  type PluginGithubSource,
  type PluginManifest,
  type PluginRegistryEntry,
  validatePluginManifest,
} from './pluginManifest.js';
import { registerGlobalPluginFromManifest } from './systemPlugins.js';
import { prisma } from './prisma.js';
import { hashManifestFile } from './plugins/pluginManifestExtras.js';
import {
  readRuntimeManifest,
  readManifestForRecord,
  reloadPluginHost,
  syncPluginCatalog,
} from '../plugins/pluginManager.js';

export const MAX_PLUGIN_ARCHIVE_BYTES = 25 * 1024 * 1024;

export interface PluginInstallResult {
  systemPluginId: string;
  installedPluginName: string;
  installPath: string;
  commitSha: string;
  scope: string;
}

async function downloadToFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Download failed (HTTP ${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_PLUGIN_ARCHIVE_BYTES) {
    throw new Error('Plugin archive exceeds maximum allowed size');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_PLUGIN_ARCHIVE_BYTES) {
    throw new Error('Plugin archive exceeds maximum allowed size');
  }

  await fs.promises.writeFile(destination, buffer);
}

function findArchiveRoot(extractDir: string): string {
  const entries = fs.readdirSync(extractDir, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory());
  if (dirs.length !== 1) {
    throw new Error('Unexpected archive layout');
  }
  return path.join(extractDir, dirs[0].name);
}

async function copyDirectory(from: string, to: string): Promise<void> {
  await fs.promises.mkdir(to, { recursive: true });
  const entries = await fs.promises.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(src, dest);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(src, dest);
    }
  }
}

async function extractGithubPluginSource(
  source: PluginGithubSource,
  targetDir: string,
): Promise<void> {
  const archiveUrl = `https://github.com/${source.repo}/archive/${source.commitSha}.tar.gz`;
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'esiana-plugin-'));
  const archivePath = path.join(tempRoot, 'archive.tar.gz');
  const extractDir = path.join(tempRoot, 'extract');

  try {
    await downloadToFile(archiveUrl, archivePath);
    await fs.promises.mkdir(extractDir, { recursive: true });
    await pipeline(
      fs.createReadStream(archivePath),
      createGunzip(),
      tar.extract({ cwd: extractDir }),
    );

    const repoRoot = findArchiveRoot(extractDir);
    const pluginSourceDir = path.join(repoRoot, source.path.replace(/\\/g, '/'));
    if (!fs.existsSync(pluginSourceDir)) {
      throw new Error(`Plugin path "${source.path}" not found in archive`);
    }

    await fs.promises.rm(targetDir, { recursive: true, force: true });
    await fs.promises.mkdir(path.dirname(targetDir), { recursive: true });
    await copyDirectory(pluginSourceDir, targetDir);
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
  }
}

function readRuntimeManifestFromDir(pluginDir: string): PluginManifest | null {
  if (!fs.existsSync(pluginDir)) return null;
  return readRuntimeManifest(pluginDir);
}

/** Dev monorepo / plugins:link copy when registry install has not been published yet. */
export function resolveLocalPluginSourceDir(entry: PluginRegistryEntry): string | null {
  const pluginPath =
    entry.source?.type === 'github'
      ? entry.source.path.replace(/\\/g, '/')
      : entry.id;

  const linkedDir = path.join(env.pluginsDir, path.basename(pluginPath));
  if (fs.existsSync(path.join(linkedDir, 'manifest.json'))) {
    return linkedDir;
  }

  const monorepoDir = path.join(env.repoRoot, '..', 'community-plugins', pluginPath);
  if (fs.existsSync(path.join(monorepoDir, 'manifest.json'))) {
    return monorepoDir;
  }

  return null;
}

function mergeValidatedLocalManifest(
  entry: PluginRegistryEntry,
  runtime: PluginManifest,
): PluginManifest {
  if (runtime.id !== entry.id) {
    throw new Error('Local manifest id does not match registry entry');
  }
  if (runtime.version !== entry.version) {
    throw new Error('Local manifest version does not match registry entry');
  }
  return {
    ...registryEntryToManifest(entry),
    ...runtime,
    category: runtime.category ?? entry.category,
  };
}

export async function ensurePluginPackageOnDisk(
  entry: PluginRegistryEntry,
  source: PluginGithubSource,
): Promise<{ installPath: string; targetDir: string }> {
  const installPath = `${entry.id}/${source.commitSha}`;
  const targetDir = path.join(env.pluginsDir, installPath);

  if (!readRuntimeManifestFromDir(targetDir)) {
    const localDir = resolveLocalPluginSourceDir(entry);
    if (localDir) {
      await fs.promises.rm(targetDir, { recursive: true, force: true });
      await fs.promises.mkdir(path.dirname(targetDir), { recursive: true });
      await copyDirectory(localDir, targetDir);
    } else {
      await extractGithubPluginSource(source, targetDir);
    }
  }

  return { installPath, targetDir };
}

async function resolveInstallManifest(
  entry: PluginRegistryEntry,
): Promise<PluginManifest> {
  const localDir = resolveLocalPluginSourceDir(entry);
  if (localDir) {
    const runtime = readRuntimeManifestFromDir(localDir);
    if (runtime) {
      return mergeValidatedLocalManifest(entry, runtime);
    }
  }

  if (entry.manifestUrl) {
    const target = parseTargetUrl(entry.manifestUrl);
    if (!target) {
      throw new Error('Registry entry manifestUrl is invalid');
    }

    const fetched = await fetchAndValidateManifestFromUrl(target);
    if (!fetched.ok) {
      throw new Error(fetched.error);
    }

    return mergeValidatedLocalManifest(entry, fetched.manifest);
  }

  return registryEntryToManifest(entry);
}

function assertRuntimeManifest(manifest: PluginManifest): void {
  const backendOptional = isDataOnlyContentPackPlugin(manifest);
  if (!manifest.backendEntry?.trim() && !backendOptional) {
    throw new Error('Installed plugin manifest must declare backendEntry');
  }
  if (!manifest.frontendEntry && !isBackendOnlyGlobalPlugin(manifest)) {
    throw new Error(
      'Installed plugin manifest must declare frontendEntry (or be a backend-only global plugin with contentPack, campaignGenerator, or developmentProvider capability)',
    );
  }
}

function runtimeFrontendEntry(manifest: PluginManifest): string {
  return manifest.frontendEntry ?? '';
}

async function upsertInstalledPluginRecord(
  manifest: PluginManifest,
  source: PluginGithubSource,
  installPath: string,
  options?: { installedByUserId?: string; targetDir?: string },
): Promise<void> {
  const isCampaignScope = manifest.scope === PluginScopes.CAMPAIGN;

  let manifestChecksum = '';
  if (options?.targetDir) {
    const manifestPath = path.join(options.targetDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      manifestChecksum = hashManifestFile(manifestPath);
    }
  }

  await prisma.installedPlugin.upsert({
    where: { name: manifest.id },
    create: {
      name: manifest.id,
      githubUrl: manifest.githubUrl ?? `https://github.com/${source.repo}`,
      version: manifest.version,
      isEnabled: isCampaignScope,
      backendEntry: manifest.backendEntry?.trim() ?? '',
      frontendEntry: runtimeFrontendEntry(manifest),
      commitSha: source.commitSha,
      sourceRepo: source.repo,
      installPath,
      manifestChecksum,
      trustedInstall: true,
      installedByUserId: options?.installedByUserId ?? null,
      runtimeStatus: 'active',
    },
    update: {
      githubUrl: manifest.githubUrl ?? `https://github.com/${source.repo}`,
      version: manifest.version,
      backendEntry: manifest.backendEntry?.trim() ?? '',
      frontendEntry: runtimeFrontendEntry(manifest),
      commitSha: source.commitSha,
      sourceRepo: source.repo,
      installPath,
      manifestChecksum,
      trustedInstall: true,
      ...(isCampaignScope ? { isEnabled: true } : {}),
      ...(options?.installedByUserId ? { installedByUserId: options.installedByUserId } : {}),
    },
  });
}

async function registerServerPluginDefinition(manifest: PluginManifest): Promise<void> {
  if (manifest.scope === PluginScopes.CAMPAIGN) {
    await registerCampaignPluginDefinition(manifest);
    return;
  }
  await registerGlobalPluginFromManifest(manifest);
}

export async function installBundledPlugin(pluginId: string): Promise<PluginInstallResult> {
  let record = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  if (!record) {
    await syncPluginCatalog();
    record = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  }
  if (!record) {
    throw new Error(
      `Plugin "${pluginId}" is not available on this server. Run npm run plugins:link, then sync the plugin catalog.`,
    );
  }

  const manifest = readManifestForRecord(record);
  if (!manifest) {
    throw new Error(`Plugin "${pluginId}" has an invalid on-disk manifest`);
  }

  assertRuntimeManifest(manifest);
  await registerServerPluginDefinition(manifest);

  if (manifest.scope === PluginScopes.CAMPAIGN) {
    await prisma.installedPlugin.update({
      where: { name: pluginId },
      data: { isEnabled: true },
    });
    await reloadPluginHost();
  }

  return {
    systemPluginId: manifest.id,
    installedPluginName: manifest.id,
    installPath: record.installPath,
    commitSha: record.commitSha || 'bundled',
    scope: manifest.scope,
  };
}

/** @deprecated Use installBundledPlugin */
export async function installBundledGlobalPlugin(pluginId: string): Promise<PluginInstallResult> {
  return installBundledPlugin(pluginId);
}

export async function installPluginFromRegistryEntry(
  entry: PluginRegistryEntry,
): Promise<PluginInstallResult> {
  if (entry.source?.type === 'bundled') {
    return installBundledPlugin(entry.id);
  }

  if (!isRegistryEntryInstallable(entry)) {
    throw new Error('This registry entry is not installable (missing pinned GitHub source)');
  }

  const source = entry.source!;
  const manifest = await resolveInstallManifest(entry);

  const { installPath, targetDir } = await ensurePluginPackageOnDisk(entry, source);

  const runtimeManifest = readRuntimeManifest(targetDir);
  if (!runtimeManifest) {
    throw new Error('Extracted plugin is missing a valid manifest.json');
  }

  const mergedManifest: PluginManifest = {
    ...manifest,
    ...runtimeManifest,
    id: manifest.id,
    scope: manifest.scope,
  };

  const validated = validatePluginManifest(mergedManifest);
  if (!validated.ok) {
    throw new Error(validated.errors.join('; '));
  }

  assertRuntimeManifest(validated.manifest);
  await registerServerPluginDefinition(validated.manifest);

  await upsertInstalledPluginRecord(validated.manifest, source, installPath, {
    targetDir,
  });

  if (validated.manifest.scope === PluginScopes.CAMPAIGN) {
    await reloadPluginHost();
  }

  return {
    systemPluginId: validated.manifest.id,
    installedPluginName: validated.manifest.id,
    installPath,
    commitSha: source.commitSha,
    scope: validated.manifest.scope,
  };
}
