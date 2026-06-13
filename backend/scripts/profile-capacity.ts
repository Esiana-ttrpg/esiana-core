#!/usr/bin/env tsx
/**
 * Capacity profiling CLI — measures operator-relevant scenarios with avg/max latency.
 */
import { parseArgs } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  CAPACITY_SCENARIO_IDS,
  reportToMarkdown,
  type CapacityScenarioId,
} from '../src/lib/capacityProfiling/reportTypes.js';
import { runCapacityProfile } from '../src/lib/capacityProfiling/runCapacityProfile.js';

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: process.env.ESIANA_BASE_URL ?? 'http://127.0.0.1:3001' },
    token: { type: 'string', default: process.env.ESIANA_SEED_TOKEN },
    slug: { type: 'string' },
    scenarios: { type: 'string', default: CAPACITY_SCENARIO_IDS.join(',') },
    iterations: { type: 'string', default: '3' },
    output: { type: 'string' },
    'backup-zip': { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`Usage: profile-capacity [options]

  --base-url      API origin (default http://127.0.0.1:3001)
  --token         Bearer token with campaign access
  --slug          Campaign handle to profile
  --scenarios     Comma-separated: ${CAPACITY_SCENARIO_IDS.join(',')}
  --iterations    Runs per scenario (default 3)
  --output        Write JSON report to path (optional .md sibling)
  --backup-zip    ZIP path for import scenario (optional; skipped when omitted)
`);
  process.exit(0);
}

const token = values.token?.trim();
const slug = values.slug?.trim();
if (!token) {
  console.error('Missing --token or ESIANA_SEED_TOKEN');
  process.exit(1);
}
if (!slug) {
  console.error('Missing --slug (campaign handle)');
  process.exit(1);
}

const scenarioRaw = values.scenarios ?? CAPACITY_SCENARIO_IDS.join(',');
const scenarios = scenarioRaw
  .split(',')
  .map((part) => part.trim())
  .filter((part): part is CapacityScenarioId =>
    (CAPACITY_SCENARIO_IDS as readonly string[]).includes(part),
  );
if (scenarios.length === 0) {
  console.error(`No valid scenarios. Choose from: ${CAPACITY_SCENARIO_IDS.join(', ')}`);
  process.exit(1);
}

const iterations = Number.parseInt(values.iterations ?? '3', 10);
if (!Number.isFinite(iterations) || iterations < 1) {
  console.error('--iterations must be a positive integer');
  process.exit(1);
}

const report = await runCapacityProfile({
  baseUrl: values['base-url'] ?? 'http://127.0.0.1:3001',
  token,
  campaignHandle: slug,
  iterations,
  scenarios,
  backupZipPath: values['backup-zip'],
});

const json = JSON.stringify(report, null, 2);
console.log(json);

if (values.output) {
  const outputPath = path.resolve(values.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, json, 'utf8');
  const mdPath = outputPath.replace(/\.json$/i, '') + '.md';
  if (mdPath !== outputPath) {
    await writeFile(mdPath, reportToMarkdown(report), 'utf8');
    console.error(`Wrote ${outputPath} and ${mdPath}`);
  } else {
    console.error(`Wrote ${outputPath}`);
  }
}
