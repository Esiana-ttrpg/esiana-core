import { buildPresetSeedPlan } from './buildPresetPlan.js';
import { buildGenericSeedPlan } from './buildGenericSeedPlan.js';

/**
 * @param {object} ctx
 * @param {import('../simulationClock.js').SimulationClock} ctx.clock
 * @param {() => number} ctx.rng
 * @param {string} ctx.dmUserId
 * @param {string[]} ctx.playerUserIds
 * @param {number} ctx.unresolvedRate
 * @param {'quiet' | 'active' | 'obsessive'} ctx.density
 */
export function buildSeedPlan(ctx) {
  if (ctx.presetId) {
    return buildPresetSeedPlan(ctx);
  }
  return buildGenericSeedPlan(ctx);
}

export { buildGenericSeedPlan } from './buildGenericSeedPlan.js';
