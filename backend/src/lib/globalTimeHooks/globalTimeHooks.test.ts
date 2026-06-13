import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma } from '@prisma/client';
import {
  GLOBAL_TIME_HOOK_ORDER,
  STUB_HANDLER_VERSION,
} from '../../../../shared/globalTimeHooks.js';
import { GlobalTimeHookExecutionError } from './errors.js';
import {
  clearGlobalTimeHookRegistryForTests,
  getRegisteredGlobalTimeHooks,
  registerGlobalTimeHook,
} from './handlers/index.js';
import { buildGlobalTimeAdvanceContext } from './parseContext.js';
import { runGlobalTimeHooks } from './orchestrator.js';
import {
  isGlobalTimeHooksRunning,
  resetGlobalTimeHooksGuardForTests,
} from './recursionGuard.js';

type RunRow = {
  id: string;
  campaignId: string;
  source: string;
  sourceRef: string | null;
  nextEpochMinute: bigint;
  receipt: unknown;
};

function createMockTx(existingRuns: RunRow[] = []) {
  const runs = [...existingRuns];

  const tx = {
    timeAdvanceSimulationRun: {
      findFirst: async ({
        where,
      }: {
        where: {
          campaignId: string;
          source: string;
          sourceRef: string;
          nextEpochMinute: bigint;
        };
      }) =>
        runs.find(
          (row) =>
            row.campaignId === where.campaignId &&
            row.source === where.source &&
            row.sourceRef === where.sourceRef &&
            row.nextEpochMinute === where.nextEpochMinute,
        ) ?? null,
      create: async ({
        data,
      }: {
        data: {
          id: string;
          campaignId: string;
          source: string;
          sourceRef: string | null;
          nextEpochMinute: bigint;
          receipt: unknown;
        };
      }) => {
        runs.push({
          id: data.id,
          campaignId: data.campaignId,
          source: data.source,
          sourceRef: data.sourceRef,
          nextEpochMinute: data.nextEpochMinute,
          receipt: data.receipt,
        });
        return data;
      },
    },
  };

  return { tx: tx as unknown as Prisma.TransactionClient, runs };
}

test('registered handlers follow GLOBAL_TIME_HOOK_ORDER', () => {
  const registered = getRegisteredGlobalTimeHooks().map((entry) => entry.hookId);
  assert.deepEqual(registered, [...GLOBAL_TIME_HOOK_ORDER]);
});

test('buildGlobalTimeAdvanceContext includes advanceMagnitude', () => {
  const context = buildGlobalTimeAdvanceContext({
    campaignId: 'camp-1',
    previousEpochMinute: 0n,
    nextEpochMinute: 1440n,
    advancedBy: { amount: 1n, unit: 'days' },
    source: 'time_tracking',
  });
  assert.equal(context.advanceMagnitude, 'medium');
  assert.equal(context.elapsedMinutes, '1440');
});

test('runGlobalTimeHooks returns skipped stub results with timing metadata', async () => {
  const { tx, runs } = createMockTx();
  const context = buildGlobalTimeAdvanceContext({
    campaignId: 'camp-1',
    previousEpochMinute: 0n,
    nextEpochMinute: 60n,
    advancedBy: { amount: 60n, unit: 'minutes' },
    source: 'time_tracking',
  });

  const receipt = await runGlobalTimeHooks(tx, context);

  assert.equal(receipt.results.length, 6);
  assert.equal(receipt.semanticsVersion, 'time-hooks-v1');
  assert.ok(receipt.startedAt);
  assert.ok(receipt.completedAt);
  assert.ok(receipt.durationMs >= 0);
  for (const result of receipt.results) {
    assert.equal(result.status, 'skipped');
    assert.equal(result.handlerVersion, STUB_HANDLER_VERSION);
    assert.ok(result.durationMs >= 0);
    assert.equal(result.counts?.entitiesScanned, 0);
  }
  assert.equal(runs.length, 1);
});

test('runGlobalTimeHooks dedupes world-advance batch replays', async () => {
  const context = buildGlobalTimeAdvanceContext({
    campaignId: 'camp-1',
    previousEpochMinute: 0n,
    nextEpochMinute: 120n,
    advancedBy: { amount: 2n, unit: 'hours' },
    source: 'world_advance',
    batchId: 'batch-1',
  });
  const firstReceipt = {
    runId: 'existing-run',
    semanticsVersion: 'time-hooks-v1',
    context,
    results: [],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 1,
  };
  const { tx } = createMockTx([
    {
      id: 'existing-run',
      campaignId: 'camp-1',
      source: 'world_advance',
      sourceRef: 'batch-1',
      nextEpochMinute: 120n,
      receipt: firstReceipt,
    },
  ]);

  const receipt = await runGlobalTimeHooks(tx, context);
  assert.equal(receipt.runId, 'existing-run');
});

test('canonical hook failure aborts with GlobalTimeHookExecutionError', async () => {
  clearGlobalTimeHookRegistryForTests();
  registerGlobalTimeHook({
    hookId: 'cooldown_expiry',
    handlerVersion: 'test-fail-v1',
    run: async () => ({
      handlerVersion: 'test-fail-v1',
      status: 'failed',
      error: 'boom',
    }),
  });

  const { tx } = createMockTx();
  const context = buildGlobalTimeAdvanceContext({
    campaignId: 'camp-1',
    previousEpochMinute: 0n,
    nextEpochMinute: 10n,
    advancedBy: { amount: 10n, unit: 'minutes' },
    source: 'time_tracking',
  });

  await assert.rejects(
    () => runGlobalTimeHooks(tx, context),
    (error: unknown) => {
      assert.ok(error instanceof GlobalTimeHookExecutionError);
      assert.equal(error.hookId, 'cooldown_expiry');
      assert.equal(error.partialResults.length, 1);
      return true;
    },
  );

  clearGlobalTimeHookRegistryForTests();
});

test('nested runGlobalTimeHooks is rejected', async () => {
  resetGlobalTimeHooksGuardForTests();
  clearGlobalTimeHookRegistryForTests();
  registerGlobalTimeHook({
    hookId: 'cooldown_expiry',
    handlerVersion: 'nested-test-v1',
    run: async (nestedTx, nestedContext) => {
      await runGlobalTimeHooks(nestedTx, nestedContext);
      return {
        handlerVersion: 'nested-test-v1',
        status: 'noop',
      };
    },
  });

  const { tx } = createMockTx();
  const context = buildGlobalTimeAdvanceContext({
    campaignId: 'camp-1',
    previousEpochMinute: 0n,
    nextEpochMinute: 5n,
    advancedBy: { amount: 5n, unit: 'minutes' },
    source: 'time_tracking',
  });

  await assert.rejects(() => runGlobalTimeHooks(tx, context), /NESTED_GLOBAL_TIME_HOOKS/);
  assert.equal(isGlobalTimeHooksRunning(), false);
  clearGlobalTimeHookRegistryForTests();
});

test('haven_updates handler is registered when module loads', async () => {
  clearGlobalTimeHookRegistryForTests();
  await import('./handlers/havenUpdates.js');
  const entry = getRegisteredGlobalTimeHooks().find((hook) => hook.hookId === 'haven_updates');
  assert.ok(entry);
  assert.equal(entry?.handlerVersion, 'haven-simulation-v2');
  clearGlobalTimeHookRegistryForTests();
});
