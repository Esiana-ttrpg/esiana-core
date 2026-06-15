const mod = await import('../dist/shared/campaignPolicy/policy.js');

if (typeof mod.buildCampaignActor !== 'function') {
  throw new Error('buildCampaignActor export missing from compiled shared policy module');
}
if (typeof mod.can !== 'function') {
  throw new Error('can export missing from compiled shared policy module');
}
