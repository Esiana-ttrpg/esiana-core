import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import {
  PluginCapabilities,
  PluginScopes,
  type GeneratorPreset,
  type PluginManifest,
} from './pluginManifest.js';
import { readManifestForRecord } from '../plugins/pluginManager.js';

export interface CampaignGeneratorCard {
  pluginId: string;
  pluginName: string;
  preset: GeneratorPreset;
}

export interface WizardGeneratorSpec {
  pluginId: string;
  presetId: string;
  seed?: string;
  density?: 'quiet' | 'active' | 'obsessive';
  attachCampaignPlugins?: string[];
}

function isCampaignGeneratorManifest(manifest: PluginManifest): boolean {
  return (
    manifest.scope === PluginScopes.GLOBAL &&
    (manifest.capabilities?.includes(PluginCapabilities.CAMPAIGN_GENERATOR) ?? false)
  );
}

/** @deprecated Campaign generators retired — use Content Packs and Sample Data. */
export async function listEnabledCampaignGenerators(): Promise<CampaignGeneratorCard[]> {
  return [];
}

export async function resolveWizardGeneratorSpec(
  spec: WizardGeneratorSpec,
): Promise<
  | {
      ok: true;
      manifest: PluginManifest;
      preset: GeneratorPreset;
      seed: string;
      density: 'quiet' | 'active' | 'obsessive';
      attachCampaignPlugins: string[];
    }
  | { ok: false; error: string }
> {
  const pluginId = spec.pluginId.trim();
  const presetId = spec.presetId.trim();
  if (!pluginId || !presetId) {
    return { ok: false, error: 'Generator pluginId and presetId are required' };
  }

  const systemRow = await prisma.systemPlugin.findUnique({
    where: { id: pluginId },
    select: { isEnabled: true, scope: true },
  });
  if (!systemRow?.isEnabled || systemRow.scope !== PluginScopes.GLOBAL) {
    return { ok: false, error: `Campaign generator "${pluginId}" is not enabled globally` };
  }

  const installed = await prisma.installedPlugin.findUnique({ where: { name: pluginId } });
  if (!installed?.isEnabled) {
    return { ok: false, error: `Campaign generator "${pluginId}" is not installed or enabled` };
  }

  const manifest = readManifestForRecord(installed);
  if (!manifest || !isCampaignGeneratorManifest(manifest)) {
    return { ok: false, error: `Plugin "${pluginId}" is not a campaign generator` };
  }

  const preset = manifest.generatorPresets?.find((entry) => entry.id === presetId);
  if (!preset) {
    return { ok: false, error: `Unknown generator preset "${presetId}"` };
  }

  const density =
    spec.density === 'quiet' || spec.density === 'active' || spec.density === 'obsessive'
      ? spec.density
      : 'active';

  const seed =
    typeof spec.seed === 'string' && spec.seed.trim()
      ? spec.seed.trim()
      : preset.defaultSeed ?? `${presetId}-${Date.now()}`;

  const attachCampaignPlugins =
    spec.attachCampaignPlugins?.length
      ? spec.attachCampaignPlugins
      : preset.attachCampaignPlugins ?? [];

  return {
    ok: true,
    manifest,
    preset,
    seed,
    density,
    attachCampaignPlugins,
  };
}

export function campaignGeneratorBaseUrl(): string {
  return process.env.API_INTERNAL_BASE_URL ?? `http://127.0.0.1:${env.port}`;
}
