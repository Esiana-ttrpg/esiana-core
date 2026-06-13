export type CapacityScenarioId =
  | 'import'
  | 'export'
  | 'campaign-load'
  | 'character-search'
  | 'timeline-projection'
  | 'map-load';

export const CAPACITY_SCENARIO_IDS: CapacityScenarioId[] = [
  'import',
  'export',
  'campaign-load',
  'character-search',
  'timeline-projection',
  'map-load',
];

export interface CapacityScenarioTiming {
  iterations: number;
  avgMs: number;
  maxMs: number;
  errors: number;
  payloadBytes?: number;
  /** Reserved for future percentile reporting */
  p50Ms?: number;
  p95Ms?: number;
  p99Ms?: number;
}

/** Entity counts aligned with {@link CampaignSizeSnapshot} tier fields (excludes asset metrics). */
export interface CapacityCampaignSnapshot {
  pageCount: number;
  characterCount: number;
  locationCount: number;
  organizationCount: number;
  sessionCount: number;
  mapCount: number;
}

export interface CapacityProfilingReport {
  schemaVersion: 1;
  capturedAt: string;
  environment: {
    db?: string;
    campaignHandle: string;
    profileId?: string;
    label?: string;
    platform?: string;
    nodeVersion?: string;
    ramGb?: number;
    campaignCount?: number;
  };
  campaignSnapshot: CapacityCampaignSnapshot;
  scenarios: Partial<Record<CapacityScenarioId, CapacityScenarioTiming>>;
}

export function summarizeTimings(samplesMs: number[]): Pick<
  CapacityScenarioTiming,
  'iterations' | 'avgMs' | 'maxMs' | 'errors'
> {
  if (samplesMs.length === 0) {
    return { iterations: 0, avgMs: 0, maxMs: 0, errors: 0 };
  }
  const sum = samplesMs.reduce((acc, value) => acc + value, 0);
  return {
    iterations: samplesMs.length,
    avgMs: Math.round(sum / samplesMs.length),
    maxMs: Math.max(...samplesMs),
    errors: 0,
  };
}

export function reportToMarkdown(report: CapacityProfilingReport): string {
  const lines = [
    `# Capacity profile — ${report.environment.campaignHandle}`,
    '',
    `Captured: ${report.capturedAt}`,
    '',
    '## Campaign snapshot',
    '',
    ...Object.entries(report.campaignSnapshot).map(
      ([key, value]) => `- ${key}: ${value.toLocaleString()}`,
    ),
    '',
    '## Scenario timings (avg / max ms)',
    '',
    '| Scenario | Iterations | Avg ms | Max ms | Errors |',
    '|----------|------------|--------|--------|--------|',
  ];

  for (const scenarioId of CAPACITY_SCENARIO_IDS) {
    const row = report.scenarios[scenarioId];
    if (!row) continue;
    lines.push(
      `| ${scenarioId} | ${row.iterations} | ${row.avgMs} | ${row.maxMs} | ${row.errors} |`,
    );
  }

  lines.push('', '_Percentile metrics deferred in schema v1._');
  return lines.join('\n');
}
