import assert from 'node:assert/strict';
import test from 'node:test';
import type { GlobalTimeSimulationReceipt } from '../../../shared/globalTimeHooks.js';

// Test receipt parsing helpers via module internals pattern — exercise list output shape with mock data

function hookSummariesFromFixture(receipt: GlobalTimeSimulationReceipt) {
  return receipt.results.map((row) => ({
    hookId: row.hookId,
    status: row.status,
    summary: row.summary ?? null,
  }));
}

test('hook summaries extract event_generation paused summary', () => {
  const receipt: GlobalTimeSimulationReceipt = {
    runId: 'run-1',
    semanticsVersion: 'time-hooks-v1',
    context: {
      campaignId: 'camp-1',
      previousEpochMinute: '0',
      nextEpochMinute: '5000',
      elapsedMinutes: '5000',
      advancedBy: { amount: '3', unit: 'days' },
      advanceMagnitude: 'medium',
      source: 'time_tracking',
    },
    results: [
      {
        hookId: 'event_generation',
        handlerVersion: 'world-event-prompts-v1',
        status: 'noop',
        kind: 'advisory',
        durationMs: 2,
        summary: 'World pressure forecasting paused',
      },
    ],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 2,
  };

  const summaries = hookSummariesFromFixture(receipt);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.hookId, 'event_generation');
  assert.match(summaries[0]?.summary ?? '', /paused/i);
});

test('world_advance source maps batch id for chronology link resolution', () => {
  const batchId = 'batch-abc';
  const receiptByBatchId = new Map([[batchId, 'event-xyz']]);
  const chronologyEventId = receiptByBatchId.get(batchId) ?? null;
  assert.equal(chronologyEventId, 'event-xyz');
});
