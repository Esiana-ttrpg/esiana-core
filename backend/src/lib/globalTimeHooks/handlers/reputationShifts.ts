import { registerGlobalTimeHook } from './index.js';
import { runReputationSimulation } from '../../reputationSimulationService.js';
import type { GlobalTimeHookHandler } from './types.js';

export const REPUTATION_SIMULATION_HANDLER_VERSION = 'reputation-simulation-v1';

const runReputationShiftsHook: GlobalTimeHookHandler = async (tx, context) => {
  const result = await runReputationSimulation(tx, context);

  if (
    result.entitiesUpdated === 0 &&
    result.eventsCreated === 0 &&
    result.suggestionsCreated === 0
  ) {
    return {
      handlerVersion: REPUTATION_SIMULATION_HANDLER_VERSION,
      status: 'noop',
      summary: 'No reputation simulation updates',
      counts: {
        entitiesScanned: result.entitiesScanned,
        entitiesUpdated: 0,
      },
    };
  }

  const summaryParts: string[] = [];
  if (result.entitiesUpdated > 0) {
    summaryParts.push(`${result.entitiesUpdated.toString()} faction(s) updated`);
  }
  if (result.eventsCreated > 0) {
    summaryParts.push(`${result.eventsCreated.toString()} drift event(s)`);
  }
  if (result.suggestionsCreated > 0) {
    summaryParts.push(`${result.suggestionsCreated.toString()} suggestion(s) queued`);
  }

  return {
    handlerVersion: REPUTATION_SIMULATION_HANDLER_VERSION,
    status: result.partial ? 'partial' : 'applied',
    summary: summaryParts.join('; '),
    counts: {
      entitiesScanned: result.entitiesScanned,
      entitiesUpdated: result.entitiesUpdated,
    },
  };
};

registerGlobalTimeHook({
  hookId: 'reputation_shifts',
  handlerVersion: REPUTATION_SIMULATION_HANDLER_VERSION,
  run: runReputationShiftsHook,
});
