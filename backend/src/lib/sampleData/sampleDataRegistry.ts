import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSampleDataEnabled } from '../../config/env.js';
import type { SimulationDensity } from './simulationClock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = path.join(__dirname, 'profiles');

export interface SampleDataProfileParams {
  pageCount?: number;
  characterCount?: number;
  locationCount: number;
  organizationCount?: number;
  factionCount?: number;
  sessionCount: number;
  npcCount?: number;
  mapCount?: number;
  fillerPageCount?: number;
  unresolvedRate: number;
  assetCount?: number;
  assetStorageBytes?: number;
}

interface ProfileFile {
  id: string;
  label: string;
  description: string;
  defaultSeed: string;
  defaultDensity: SimulationDensity;
  wizardVisible?: boolean;
  params: SampleDataProfileParams;
  executorConcurrency?: number;
}

export interface SampleDataProfileCard {
  kind: 'sampleData';
  source: 'core';
  profileId: string;
  label: string;
  description: string;
  defaultSeed: string;
  defaultDensity: SimulationDensity;
  wizardVisible: boolean;
}

export interface SampleDataSpec {
  kind: 'sampleData';
  profileId: string;
  seed?: string;
  density?: SimulationDensity;
}

export interface ResolvedSampleDataSpec {
  profileId: string;
  seed: string;
  density: SimulationDensity;
  params: SampleDataProfileParams;
  executorConcurrency: number;
  label: string;
}

const PROFILE_IDS = [
  'benchmark-small',
  'benchmark-medium',
  'benchmark-large',
  'benchmark-extreme',
] as const;

/** Deprecated profile ids mapped to benchmark profiles for one release. */
const PROFILE_ALIASES: Record<string, (typeof PROFILE_IDS)[number]> = {
  'tiny-campaign': 'benchmark-small',
  'standard-campaign': 'benchmark-medium',
  'large-campaign': 'benchmark-large',
  'stress-test-campaign': 'benchmark-extreme',
};

function canonicalProfileId(profileId: string): string {
  return PROFILE_ALIASES[profileId] ?? profileId;
}

function loadProfileFile(profileId: string): ProfileFile {
  const canonical = canonicalProfileId(profileId);
  const filePath = path.join(PROFILES_DIR, `${canonical}.json`);
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as ProfileFile;
  return raw;
}

function toProfileCard(file: ProfileFile): SampleDataProfileCard {
  return {
    kind: 'sampleData',
    source: 'core',
    profileId: file.id,
    label: file.label,
    description: file.description,
    defaultSeed: file.defaultSeed,
    defaultDensity: file.defaultDensity,
    wizardVisible: file.wizardVisible !== false,
  };
}

export function listCoreSampleDataProfiles(options?: {
  wizardOnly?: boolean;
}): SampleDataProfileCard[] {
  if (!isSampleDataEnabled()) return [];

  const cards = PROFILE_IDS.map((profileId) => toProfileCard(loadProfileFile(profileId)));
  if (options?.wizardOnly) {
    return cards.filter((card) => card.wizardVisible);
  }
  return cards;
}

export function resolveSampleDataSpec(
  spec: SampleDataSpec,
): { ok: true; resolved: ResolvedSampleDataSpec } | { ok: false; error: string } {
  if (!isSampleDataEnabled()) {
    return { ok: false, error: 'Sample Data is disabled (ENABLE_SAMPLE_DATA=false)' };
  }

  const profileId = spec.profileId.trim();
  if (!profileId) {
    return { ok: false, error: 'profileId is required' };
  }

  const canonical = canonicalProfileId(profileId);
  if (!(PROFILE_IDS as readonly string[]).includes(canonical)) {
    return { ok: false, error: `Unknown sample data profile "${profileId}"` };
  }

  const file = loadProfileFile(canonical);
  const density =
    spec.density === 'quiet' || spec.density === 'active' || spec.density === 'obsessive'
      ? spec.density
      : file.defaultDensity;

  const seed =
    typeof spec.seed === 'string' && spec.seed.trim() ? spec.seed.trim() : file.defaultSeed;

  return {
    ok: true,
    resolved: {
      profileId: file.id,
      seed,
      density,
      params: file.params,
      executorConcurrency: file.executorConcurrency ?? 4,
      label: file.label,
    },
  };
}

export function defaultSampleDataSeed(): string {
  return randomUUID();
}

export function isDeprecatedSampleDataProfileId(profileId: string): boolean {
  return profileId in PROFILE_ALIASES;
}
