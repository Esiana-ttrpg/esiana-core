import assert from 'node:assert/strict';
import test from 'node:test';
import type { Response } from 'express';
import {
  registerCampaignEventStream,
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
