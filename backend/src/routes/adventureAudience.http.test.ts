import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import { buildCampaignActor } from '../../../shared/campaignPolicy/policy.js';
import { MembershipRoles } from '../../../shared/campaignPolicy/membershipRoles.js';
import { getAdventureHubBySystemKey, getAdventureHubIndex, getStoryboardLayout } from '../controllers/adventureHubController.js';
import { getQuestHubBySystemKey, getQuestHubIndex, getThreadHubBySystemKey, getThreadHubIndex } from '../controllers/wikiController.js';
import { getCampaignTimeTracking } from '../controllers/campaignsController.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';

// The production controller handlers are mounted behind a stub scope here; the separate
// database-backed suite is still needed to exercise authentication and campaign middleware.
test('HTTP handlers reject unsupported manager previews on primary and secondary routes', async () => {
  const actor = buildCampaignActor({ kind: 'member', userId: 'owner', membershipRole: MembershipRoles.GAMEMASTER,
    campaignOwnerUserId: 'owner', discoverability: 'private', allowPlayerChronologyManagement: false });
  const app = express();
  app.use((req, _res, next) => { (req as CampaignScopedRequest).campaign = { actor, campaignId: 'one' } as CampaignScopedRequest['campaign']; next(); });
  app.get('/wiki/adventure-hub', getAdventureHubBySystemKey);
  app.get('/wiki/adventure-hub/:pageId', getAdventureHubIndex);
  app.get('/wiki/quests-hub', getQuestHubBySystemKey);
  app.get('/wiki/quests-hub/:pageId', getQuestHubIndex);
  app.get('/wiki/threads-hub', getThreadHubBySystemKey);
  app.get('/wiki/threads-hub/:pageId', getThreadHubIndex);
  app.get('/adventure/storyboard', getStoryboardLayout);
  app.get('/time-tracking', getCampaignTimeTracking);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    for (const path of ['/wiki/adventure-hub', '/wiki/adventure-hub/any', '/wiki/quests-hub', '/wiki/quests-hub/any',
      '/wiki/threads-hub', '/wiki/threads-hub/any', '/adventure/storyboard']) {
      for (const query of ['true', '1']) {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}?previewAsPlayer=${query}`);
        assert.equal(response.status, 503, `${path} should reject the preview`);
        assert.deepEqual(await response.json(), { error: 'Audience preview is temporarily unavailable.' });
      }
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
