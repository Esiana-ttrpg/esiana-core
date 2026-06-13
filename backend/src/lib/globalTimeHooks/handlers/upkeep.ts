import { registerGlobalTimeHook } from './index.js';
import { runScheduledEffectFires } from '../../scheduledEffectFireService.js';
import type { GlobalTimeHookHandler } from './types.js';

export const UPKEEP_HANDLER_VERSION = 'upkeep-v1';

const runUpkeepHook: GlobalTimeHookHandler = async (tx, context) => {
  const result = await runScheduledEffectFires(tx, context);

  const totalSuggestions =
    result.treasuryApplied + result.narrativeGenerated;

  const counts = {
    entitiesScanned: result.schedulesScanned,
    entitiesUpdated: result.schedulesTriggered,
    eventsGenerated: totalSuggestions,
    schedulesScanned: result.schedulesScanned,
    schedulesTriggered: result.schedulesTriggered,
    treasuryApplied: result.treasuryApplied,
    narrativeGenerated: result.narrativeGenerated,
    narrativeSuppressed: result.narrativeSuppressed,
    cappedSchedules: result.cappedSchedules,
    remaining: result.remaining,
  };

  if (
    totalSuggestions === 0 &&
    result.narrativeSuppressed === 0 &&
    result.schedulesTriggered === 0
  ) {
    return {
      handlerVersion: UPKEEP_HANDLER_VERSION,
      status: 'noop',
      summary: 'No scheduled effects due',
      counts,
    };
  }

  const summaryParts: string[] = [];
  if (result.treasuryApplied > 0) {
    summaryParts.push(
      `${result.treasuryApplied.toString()} treasury schedule${result.treasuryApplied === 1 ? '' : 's'} applied`,
    );
  }
  if (result.narrativeGenerated > 0) {
    summaryParts.push(
      `${result.narrativeGenerated.toString()} world event prompt${result.narrativeGenerated === 1 ? '' : 's'} generated`,
    );
  }
  if (result.narrativeSuppressed > 0) {
    summaryParts.push(
      `${result.narrativeSuppressed.toString()} narrative prompt${result.narrativeSuppressed === 1 ? '' : 's'} suppressed`,
    );
  }
  if (result.schedulesTriggered > 0 && summaryParts.length === 0) {
    summaryParts.push(
      `${result.schedulesTriggered.toString()} schedule${result.schedulesTriggered === 1 ? '' : 's'} triggered`,
    );
  }
  if (result.remaining) {
    summaryParts.push('cap reached — more due on next advance');
  }

  return {
    handlerVersion: UPKEEP_HANDLER_VERSION,
    status: result.remaining ? 'partial' : 'applied',
    summary: summaryParts.join('; ') || 'Scheduled effects processed',
    counts,
  };
};

registerGlobalTimeHook({
  hookId: 'upkeep',
  handlerVersion: UPKEEP_HANDLER_VERSION,
  run: runUpkeepHook,
});
