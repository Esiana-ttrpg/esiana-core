import { createRng } from './rng.js';
import { SimulationClock } from './simulationClock.js';
import { buildSeedPlan } from './buildSeedPlan.js';
import { executeSeedPlan } from './networkExecutor.js';

/**
 * @param {object} options
 * @param {string} options.baseUrl
 * @param {string} options.bearerToken
 * @param {string} options.campaignSlug
 * @param {string} options.seed
 * @param {string} options.dmUserId
 * @param {string[]} options.playerUserIds
 * @param {'quiet' | 'active' | 'obsessive'} [options.density]
 * @param {number} [options.unresolvedRate]
 * @param {number} [options.concurrency]
 * @param {number} [options.resumeFrom]
 * @param {string} [options.presetId]
 * @param {(p: object) => void} [options.onProgress]
 */
export async function seedCampaign(options) {
  const {
    baseUrl,
    bearerToken,
    campaignSlug,
    seed,
    dmUserId,
    playerUserIds,
    density = 'active',
    unresolvedRate = 0.18,
    concurrency = 4,
    resumeFrom = 0,
    presetId,
    onProgress,
  } = options;

  const rng = createRng(seed);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 21);
  const clock = new SimulationClock(start, rng);

  const plan = buildSeedPlan({
    clock,
    rng,
    dmUserId,
    playerUserIds,
    unresolvedRate,
    density,
    seedString: seed,
    presetId,
  });

  const result = await executeSeedPlan(plan, {
    baseUrl,
    campaignSlug,
    bearerToken,
    concurrency,
    resumeFrom,
    onProgress,
  });

  return { plan, ...result };
}

export { buildSeedPlan } from './buildSeedPlan.js';
export { executeSeedPlan } from './networkExecutor.js';
export { SimulationClock } from './simulationClock.js';
export { createRng } from './rng.js';
