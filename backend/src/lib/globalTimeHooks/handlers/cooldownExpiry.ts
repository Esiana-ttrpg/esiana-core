import { registerGlobalTimeHook } from './index.js';
import { runQuestTimeSimulation } from '../../questTimeSimulationService.js';
import type { GlobalTimeHookHandler } from './types.js';

export const QUEST_TIME_COOLDOWN_HANDLER_VERSION = 'quest-time-cooldown-v1';

const runCooldownExpiryHook: GlobalTimeHookHandler = async (tx, context) => {
  const result = await runQuestTimeSimulation(tx, context);

  if (result.entitiesUpdated === 0 && result.signalsDetected === 0) {
    return {
      handlerVersion: QUEST_TIME_COOLDOWN_HANDLER_VERSION,
      status: 'noop',
      summary: 'No quest time simulation updates',
      counts: {
        entitiesScanned: result.entitiesScanned,
        entitiesUpdated: 0,
      },
    };
  }

  const summaryParts: string[] = [];
  if (result.signalsApplied > 0) {
    summaryParts.push(`${result.signalsApplied.toString()} signal(s) applied`);
  }
  if (result.pendingExpiryCount > 0) {
    summaryParts.push(`${result.pendingExpiryCount.toString()} expiry pending GM action`);
  }
  if (result.entitiesUpdated > 0 && result.signalsApplied === 0) {
    summaryParts.push(`${result.entitiesUpdated.toString()} quest clock(s) advanced`);
  }

  return {
    handlerVersion: QUEST_TIME_COOLDOWN_HANDLER_VERSION,
    status: 'applied',
    summary: summaryParts.join('; ') || 'Quest time simulation updated',
    counts: {
      entitiesScanned: result.entitiesScanned,
      entitiesUpdated: result.entitiesUpdated,
    },
  };
};

registerGlobalTimeHook({
  hookId: 'cooldown_expiry',
  handlerVersion: QUEST_TIME_COOLDOWN_HANDLER_VERSION,
  run: runCooldownExpiryHook,
});
