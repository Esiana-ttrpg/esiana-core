#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { seedCampaign, buildSeedPlan } from '../lib/seedCampaign.js';
import { createRng } from '../lib/rng.js';
import { SimulationClock } from '../lib/simulationClock.js';

const { values, positionals } = parseArgs({
  options: {
    'base-url': { type: 'string', default: process.env.ESIANA_BASE_URL ?? 'http://localhost:5173' },
    token: { type: 'string', default: process.env.ESIANA_SEED_TOKEN },
    slug: { type: 'string' },
    seed: { type: 'string', default: 'demo-westmarches' },
    dm: { type: 'string' },
    players: { type: 'string' },
    density: { type: 'string', default: 'active' },
    concurrency: { type: 'string', default: '4' },
    'resume-from': { type: 'string', default: '0' },
    'plan-only': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`Usage: seed-campaign [options]

  --base-url     API origin (default http://localhost:5173)
  --token        Bearer token with campaign:seed scope
  --slug         Campaign slug
  --seed         Deterministic seed string
  --dm           DM user id
  --players      Comma-separated player user ids
  --density      quiet | active | obsessive
  --concurrency  Parallel HTTP ops (default 4)
  --plan-only    Output SeedPlan JSON without HTTP
  --resume-from  Op index to resume after failure
`);
  process.exit(0);
}

const seed = values.seed ?? positionals[0] ?? 'demo-westmarches';

if (values['plan-only']) {
  const rng = createRng(seed);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 21);
  const clock = new SimulationClock(start, rng);
  const plan = buildSeedPlan({
    clock,
    rng,
    dmUserId: values.dm ?? 'dm-user',
    playerUserIds: values.players ? values.players.split(',').map((s) => s.trim()) : [],
    density: values.density,
    unresolvedRate: 0.18,
    seedString: seed,
  });
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

if (!values.token || !values.slug || !values.dm) {
  console.error('Required: --token, --slug, --dm (or set ESIANA_SEED_TOKEN)');
  process.exit(1);
}

const result = await seedCampaign({
  baseUrl: values['base-url'],
  bearerToken: values.token,
  campaignSlug: values.slug,
  seed,
  dmUserId: values.dm,
  playerUserIds: values.players ? values.players.split(',').map((s) => s.trim()) : [],
  density: values.density,
  concurrency: Number(values.concurrency) || 4,
  resumeFrom: Number(values['resume-from']) || 0,
  onProgress: ({ completed, total }) => {
    process.stderr.write(`\r[${completed}/${total}]`);
  },
});

console.error('');
console.log(JSON.stringify({ ok: true, completed: result.completed, total: result.total }, null, 2));
