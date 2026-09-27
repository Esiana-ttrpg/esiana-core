import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request } from 'express';
import { registerPluginConnectionInvocation, requirePluginConnectionInvocation } from './pluginConnectionInvocation.js';

test('plugin connection identity must be minted by core middleware', () => {
  const fabricated = {} as Request;
  assert.throws(() => requirePluginConnectionInvocation(fabricated), /Authenticated plugin request context/);
  registerPluginConnectionInvocation(fabricated, { campaignId: 'campaign-1' });
  assert.deepEqual(requirePluginConnectionInvocation(fabricated), { campaignId: 'campaign-1' });
});
