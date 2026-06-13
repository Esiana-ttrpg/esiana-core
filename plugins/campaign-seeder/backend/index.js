import { seedCampaign } from '../lib/seedCampaign.js';
import { buildSeedPlan } from '../lib/buildSeedPlan.js';
import { createRng } from '../lib/rng.js';
import { SimulationClock } from '../lib/simulationClock.js';

export function register(router) {
  router.post('/seed', async (req, res) => {
    try {
      const {
        baseUrl,
        bearerToken,
        campaignSlug,
        seed,
        dmUserId,
        playerUserIds,
        density,
        unresolvedRate,
        concurrency,
      } = req.body ?? {};

      if (!baseUrl || !bearerToken || !campaignSlug || !seed || !dmUserId) {
        res.status(400).json({
          error: 'baseUrl, bearerToken, campaignSlug, seed, and dmUserId are required',
        });
        return;
      }

      const result = await seedCampaign({
        baseUrl: String(baseUrl),
        bearerToken: String(bearerToken),
        campaignSlug: String(campaignSlug),
        seed: String(seed),
        dmUserId: String(dmUserId),
        playerUserIds: Array.isArray(playerUserIds) ? playerUserIds.map(String) : [],
        density: density ?? 'active',
        unresolvedRate: typeof unresolvedRate === 'number' ? unresolvedRate : 0.18,
        concurrency: typeof concurrency === 'number' ? concurrency : 4,
      });

      res.json({
        ok: true,
        completed: result.completed,
        total: result.total,
        seed: result.plan.seed,
        density: result.plan.density,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Seed failed',
      });
    }
  });

  router.post('/plan', (req, res) => {
    try {
      const { seed, dmUserId, playerUserIds, density, unresolvedRate } = req.body ?? {};
      if (!seed || !dmUserId) {
        res.status(400).json({ error: 'seed and dmUserId required' });
        return;
      }
      const rng = createRng(String(seed));
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - 21);
      const clock = new SimulationClock(start, rng);
      const plan = buildSeedPlan({
        clock,
        rng,
        dmUserId: String(dmUserId),
        playerUserIds: Array.isArray(playerUserIds) ? playerUserIds.map(String) : [],
        density: density ?? 'active',
        unresolvedRate: typeof unresolvedRate === 'number' ? unresolvedRate : 0.18,
        seedString: String(seed),
      });
      res.json({ plan });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Plan failed' });
    }
  });
}
