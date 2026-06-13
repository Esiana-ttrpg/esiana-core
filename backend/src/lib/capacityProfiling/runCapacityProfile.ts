import type {
  CapacityCampaignSnapshot,
  CapacityProfilingReport,
  CapacityScenarioId,
  CapacityScenarioTiming,
} from './reportTypes.js';
import { CAPACITY_SCENARIO_IDS, summarizeTimings } from './reportTypes.js';

export interface ProfileCapacityOptions {
  baseUrl: string;
  token: string;
  campaignHandle: string;
  iterations: number;
  scenarios: CapacityScenarioId[];
  backupZipPath?: string;
}

async function timedFetch(
  url: string,
  init: RequestInit & { token: string },
): Promise<{ ms: number; ok: boolean; bytes: number }> {
  const start = performance.now();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${init.token}`,
    },
  });
  const buffer = await response.arrayBuffer();
  const ms = Math.round(performance.now() - start);
  return { ms, ok: response.ok, bytes: buffer.byteLength };
}

function campaignBase(baseUrl: string, handle: string): string {
  const origin = baseUrl.replace(/\/$/, '');
  return `${origin}/api/campaigns/${encodeURIComponent(handle)}`;
}

async function fetchCampaignSnapshot(
  baseUrl: string,
  token: string,
  handle: string,
): Promise<CapacityCampaignSnapshot> {
  const response = await fetch(`${campaignBase(baseUrl, handle)}/capacity-hint`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch campaign capacity hint (${response.status})`);
  }
  const data = (await response.json()) as { snapshot?: Partial<CapacityCampaignSnapshot> };
  const snapshot = data.snapshot ?? {};
  return {
    pageCount: snapshot.pageCount ?? 0,
    characterCount: snapshot.characterCount ?? 0,
    locationCount: snapshot.locationCount ?? 0,
    organizationCount: snapshot.organizationCount ?? 0,
    sessionCount: snapshot.sessionCount ?? 0,
    mapCount: snapshot.mapCount ?? 0,
  };
}

async function runExportScenario(
  options: ProfileCapacityOptions,
): Promise<ReturnType<typeof summarizeTimings>> {
  const samples: number[] = [];
  let errors = 0;
  for (let i = 0; i < options.iterations; i += 1) {
    const result = await timedFetch(`${campaignBase(options.baseUrl, options.campaignHandle)}/backup`, {
      token: options.token,
      method: 'GET',
    });
    if (result.ok) samples.push(result.ms);
    else errors += 1;
  }
  return { ...summarizeTimings(samples), errors };
}

async function runCampaignLoadScenario(
  options: ProfileCapacityOptions,
): Promise<ReturnType<typeof summarizeTimings>> {
  const samples: number[] = [];
  let errors = 0;
  for (let i = 0; i < options.iterations; i += 1) {
    const result = await timedFetch(
      `${campaignBase(options.baseUrl, options.campaignHandle)}/dashboard`,
      { token: options.token, method: 'GET' },
    );
    if (result.ok) samples.push(result.ms);
    else errors += 1;
  }
  return { ...summarizeTimings(samples), errors };
}

async function runCharacterSearchScenario(
  options: ProfileCapacityOptions,
): Promise<ReturnType<typeof summarizeTimings>> {
  const samples: number[] = [];
  let errors = 0;
  for (let i = 0; i < options.iterations; i += 1) {
    const result = await timedFetch(
      `${campaignBase(options.baseUrl, options.campaignHandle)}/wiki/tree`,
      { token: options.token, method: 'GET' },
    );
    if (result.ok) samples.push(result.ms);
    else errors += 1;
  }
  return { ...summarizeTimings(samples), errors };
}

async function runTimelineScenario(
  options: ProfileCapacityOptions,
): Promise<ReturnType<typeof summarizeTimings>> {
  const samples: number[] = [];
  let errors = 0;
  for (let i = 0; i < options.iterations; i += 1) {
    const result = await timedFetch(
      `${campaignBase(options.baseUrl, options.campaignHandle)}/chronology/timeline`,
      { token: options.token, method: 'GET' },
    );
    if (result.ok) samples.push(result.ms);
    else errors += 1;
  }
  return { ...summarizeTimings(samples), errors };
}

async function runMapLoadScenario(
  options: ProfileCapacityOptions,
): Promise<CapacityScenarioTiming> {
  const mapsResponse = await fetch(`${campaignBase(options.baseUrl, options.campaignHandle)}/maps`, {
    headers: { Authorization: `Bearer ${options.token}` },
  });
  if (!mapsResponse.ok) {
    return { iterations: 0, avgMs: 0, maxMs: 0, errors: 1 };
  }
  const maps = (await mapsResponse.json()) as { maps?: { assetId?: string }[] };
  const assetId = maps.maps?.[0]?.assetId;
  if (!assetId) {
    const visual = await timedFetch(
      `${campaignBase(options.baseUrl, options.campaignHandle)}/visual-atlas`,
      { token: options.token, method: 'GET' },
    );
    return visual.ok
      ? { ...summarizeTimings([visual.ms]), errors: 0, payloadBytes: visual.bytes }
      : { iterations: 1, avgMs: visual.ms, maxMs: visual.ms, errors: 1 };
  }

  const samples: number[] = [];
  let errors = 0;
  for (let i = 0; i < options.iterations; i += 1) {
    const result = await timedFetch(
      `${campaignBase(options.baseUrl, options.campaignHandle)}/maps/${encodeURIComponent(assetId)}/scene`,
      { token: options.token, method: 'GET' },
    );
    if (result.ok) samples.push(result.ms);
    else errors += 1;
  }
  return { ...summarizeTimings(samples), errors };
}

async function runImportScenario(
  options: ProfileCapacityOptions,
): Promise<ReturnType<typeof summarizeTimings>> {
  if (!options.backupZipPath) {
    return { iterations: 0, avgMs: 0, maxMs: 0, errors: 0 };
  }

  const fs = await import('node:fs/promises');
  const buffer = await fs.readFile(options.backupZipPath);
  const samples: number[] = [];
  let errors = 0;

  for (let i = 0; i < options.iterations; i += 1) {
    const form = new FormData();
    form.append(
      'backupZipFile',
      new Blob([buffer], { type: 'application/zip' }),
      'benchmark-restore.zip',
    );
    const start = performance.now();
    const response = await fetch(
      `${campaignBase(options.baseUrl, options.campaignHandle)}/backup/restore`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.token}` },
        body: form,
      },
    );
    const ms = Math.round(performance.now() - start);
    if (response.ok) samples.push(ms);
    else errors += 1;
  }

  return { ...summarizeTimings(samples), errors };
}

export async function runCapacityProfile(
  options: ProfileCapacityOptions,
): Promise<CapacityProfilingReport> {
  const campaignSnapshot = await fetchCampaignSnapshot(
    options.baseUrl,
    options.token,
    options.campaignHandle,
  );

  const scenarios: CapacityProfilingReport['scenarios'] = {};

  for (const scenarioId of options.scenarios) {
    switch (scenarioId) {
      case 'import':
        scenarios.import = await runImportScenario(options);
        break;
      case 'export':
        scenarios.export = await runExportScenario(options);
        break;
      case 'campaign-load':
        scenarios['campaign-load'] = await runCampaignLoadScenario(options);
        break;
      case 'character-search':
        scenarios['character-search'] = await runCharacterSearchScenario(options);
        break;
      case 'timeline-projection':
        scenarios['timeline-projection'] = await runTimelineScenario(options);
        break;
      case 'map-load':
        scenarios['map-load'] = await runMapLoadScenario(options);
        break;
      default:
        break;
    }
  }

  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    environment: {
      db: process.env.DATABASE_URL?.startsWith('postgresql') ? 'postgresql' : 'sqlite',
      campaignHandle: options.campaignHandle,
    },
    campaignSnapshot,
    scenarios,
  };
}

export { CAPACITY_SCENARIO_IDS };
