#!/usr/bin/env tsx
/**
 * Core Sample Data CLI — replaces community-plugins/campaign-seeder for procedural fixtures.
 */
import { parseArgs } from 'node:util';
import {
  buildSeedPlan,
  createRng,
  executeSeedPlan,
  resolveSampleDataSpec,
  SimulationClock,
} from '../src/lib/sampleData/index.js';
import { campaignBootstrapBaseUrl } from '../src/lib/campaignBootstrap.js';

const { values, positionals } = parseArgs({
  options: {
    'base-url': { type: 'string', default: process.env.ESIANA_BASE_URL ?? 'http://127.0.0.1:3001' },
    token: { type: 'string', default: process.env.ESIANA_SEED_TOKEN },
    slug: { type: 'string' },
    profile: { type: 'string', default: 'benchmark-small' },
    seed: { type: 'string' },
    dm: { type: 'string' },
    density: { type: 'string', default: 'active' },
    concurrency: { type: 'string', default: '4' },
    'plan-only': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`Usage: seed-campaign [options]

  --base-url     API origin (default http://127.0.0.1:3001)
  --token        Bearer token with campaign:seed scope
  --slug         Campaign handle
  --profile      Sample data profile id (benchmark-small|medium|large|extreme; legacy aliases supported)
  --seed         Deterministic seed string (profile default when omitted)
  --dm           DM user id (for plan metadata only)
  --density      quiet | active | obsessive
  --concurrency  Parallel HTTP ops (default 4)
  --plan-only    Output SeedPlan JSON without HTTP
`);
  process.exit(0);
}

const profileId = values.profile ?? positionals[0] ?? 'benchmark-small';
const resolved = resolveSampleDataSpec({
  kind: 'sampleData',
  profileId,
  ...(values.seed ? { seed: values.seed } : {}),
  ...(values.density === 'quiet' || values.density === 'active' || values.density === 'obsessive'
    ? { density: values.density }
    : {}),
});

if (!resolved.ok) {
  console.error(resolved.error);
  console.error('Hint: set ENABLE_SAMPLE_DATA=true for core sample data profiles.');
  process.exit(1);
}

const rng = createRng(resolved.resolved.seed);
const start = new Date();
start.setUTCDate(start.getUTCDate() - 21);
const clock = new SimulationClock(start, rng);

const plan = buildSeedPlan({
  clock,
  rng,
  dmUserId: values.dm ?? 'dm-user',
  playerUserIds: values.dm ? [values.dm] : [],
  unresolvedRate: resolved.resolved.params.unresolvedRate,
  density: resolved.resolved.density,
  seedString: resolved.resolved.seed,
  profileParams: resolved.resolved.params,
  campaignSlug: values.slug ?? 'sample-campaign',
  skeletonFlavor: 'standard',
});

if (values['plan-only']) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

if (!values.token || !values.slug) {
  console.error('Required: --token, --slug (or set ESIANA_SEED_TOKEN)');
  process.exit(1);
}

const result = await executeSeedPlan(plan, {
  baseUrl: campaignBootstrapBaseUrl() || values['base-url']!,
  campaignSlug: values.slug,
  bearerToken: values.token,
  bootstrapIdMap: new Map(),
  calendarId: null,
  concurrency: Number(values.concurrency) || resolved.resolved.executorConcurrency,
  onProgress: ({ completed, total }) => {
    process.stderr.write(`\r[${completed}/${total}]`);
  },
});

process.stderr.write('\n');
console.log(JSON.stringify({ completed: result.completed, total: result.total }, null, 2));
