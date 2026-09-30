import assert from 'node:assert/strict';
import test from 'node:test';
import type { Response } from 'express';
import {
  registerCampaignEventStream,
  registerCampaignRealtimeConnection,
  revokeCampaignEventStreams,
} from './campaignEventStreams.js';

test('membership revocation immediately ends every matching active stream', () => {
  let ended = 0;
  const response = {
    writableEnded: false,
    end() {
      ended += 1;
      this.writableEnded = true;
    },
  } as unknown as Response;
  const unregister = registerCampaignEventStream('campaign-1', 'user-1', response);

  revokeCampaignEventStreams('campaign-1', 'user-1');
  unregister();

  assert.equal(ended, 1);
});

test('membership revocation closes SSE and WebSocket transports together', () => {
  let closed = 0;
  const unregister = registerCampaignRealtimeConnection('campaign-2', 'user-2', () => { closed += 1; });
  revokeCampaignEventStreams('campaign-2', 'user-2');
  unregister();
  assert.equal(closed, 1);
});
