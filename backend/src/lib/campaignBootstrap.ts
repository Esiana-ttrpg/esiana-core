import { env } from '../config/env.js';
import type { SampleDataSpec } from './sampleData/sampleDataRegistry.js';
import type { ContentPackSpec } from './sampleData/contentPackRegistry.js';
import type { WizardGeneratorSpec } from './campaignGenerators.js';

export type SampleDataDensity = 'quiet' | 'active' | 'obsessive';

export interface CampaignBootstrapSpec {
  kind: 'sampleData' | 'contentPack';
  profileId?: string;
  pluginId?: string;
  packId?: string;
  seed?: string;
  density?: SampleDataDensity;
  /** Sample Data skeleton flavor (e.g. west-marches from legacy generator presets). */
  skeletonFlavor?: string;
}

const LEGACY_CONTENT_PACK_PRESETS: Record<string, string> = {
  'tomb-of-horrors-demo': 'tomb-of-horrors-demo',
  'player-experience-demo': 'player-experience-demo',
};

export function campaignBootstrapBaseUrl(): string {
  return process.env.API_INTERNAL_BASE_URL ?? `http://127.0.0.1:${env.port}`;
}

export function parseCampaignBootstrapSpec(raw: unknown): CampaignBootstrapSpec | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const kind = record.kind;
  if (kind === 'sampleData') {
    const profileId = typeof record.profileId === 'string' ? record.profileId.trim() : '';
    if (!profileId) return null;
    return {
      kind: 'sampleData',
      profileId,
      ...(typeof record.seed === 'string' && record.seed.trim() ? { seed: record.seed.trim() } : {}),
      ...(record.density === 'quiet' || record.density === 'active' || record.density === 'obsessive'
        ? { density: record.density }
        : {}),
    };
  }
  if (kind === 'contentPack') {
    const pluginId = typeof record.pluginId === 'string' ? record.pluginId.trim() : '';
    const packId = typeof record.packId === 'string' ? record.packId.trim() : '';
    if (!pluginId || !packId) return null;
    return { kind: 'contentPack', pluginId, packId };
  }
  return null;
}

/** Legacy wizard generator → content pack or sample data shim (one-release compat). */
export function legacyGeneratorToBootstrap(
  generator: WizardGeneratorSpec,
): CampaignBootstrapSpec | null {
  if (generator.pluginId !== 'campaign-seeder') return null;

  const packId = LEGACY_CONTENT_PACK_PRESETS[generator.presetId];
  if (packId) {
    return {
      kind: 'contentPack',
      pluginId: 'demo-content-packs',
      packId,
    };
  }

  if (generator.presetId === 'west-marches') {
    return {
      kind: 'sampleData',
      profileId: 'benchmark-medium',
      skeletonFlavor: 'west-marches',
      ...(generator.seed ? { seed: generator.seed } : {}),
      ...(generator.density ? { density: generator.density } : {}),
    };
  }

  return {
    kind: 'sampleData',
    profileId: 'benchmark-medium',
    ...(generator.seed ? { seed: generator.seed } : {}),
    ...(generator.density ? { density: generator.density } : {}),
  };
}

export function toSampleDataSpec(spec: CampaignBootstrapSpec): SampleDataSpec | null {
  if (spec.kind !== 'sampleData' || !spec.profileId) return null;
  return {
    kind: 'sampleData',
    profileId: spec.profileId,
    ...(spec.seed ? { seed: spec.seed } : {}),
    ...(spec.density ? { density: spec.density } : {}),
  };
}

export function toContentPackSpec(spec: CampaignBootstrapSpec): ContentPackSpec | null {
  if (spec.kind !== 'contentPack' || !spec.pluginId || !spec.packId) return null;
  return { kind: 'contentPack', pluginId: spec.pluginId, packId: spec.packId };
}
