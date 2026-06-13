import { registerGlobalTimeHook } from './index.js';
import { runHavenThreatEscalation } from '../../havenThreatEscalationService.js';
import { runHavenSimulation } from '../../havenSimulationService.js';
import type { GlobalTimeHookHandler } from './types.js';

export const HAVEN_SIMULATION_HANDLER_VERSION = 'haven-simulation-v2';

const runHavenUpdatesHook: GlobalTimeHookHandler = async (tx, context) => {
  const escalation = await runHavenThreatEscalation(tx, context);
  const result = await runHavenSimulation(tx, context);

  const entitiesUpdated = escalation.entitiesUpdated + result.entitiesUpdated;
  if (entitiesUpdated === 0) {
    return {
      handlerVersion: HAVEN_SIMULATION_HANDLER_VERSION,
      status: 'noop',
      summary: 'No haven updates',
      counts: {
        entitiesScanned: result.entitiesScanned,
        entitiesUpdated: 0,
      },
    };
  }

  const summaryParts: string[] = [];
  if (escalation.promotionsCount > 0) {
    summaryParts.push(
      `${escalation.promotionsCount.toString()} threat promotion(s)`,
    );
  }
  if (result.entitiesUpdated > 0) {
    summaryParts.push(`${result.entitiesUpdated.toString()} haven(s) simulated`);
  }
  if (result.crossingsCount > 0) {
    summaryParts.push(`${result.crossingsCount.toString()} band crossing(s)`);
  }

  return {
    handlerVersion: HAVEN_SIMULATION_HANDLER_VERSION,
    status: result.partial ? 'partial' : 'applied',
    summary: summaryParts.join('; '),
    counts: {
      entitiesScanned: result.entitiesScanned,
      entitiesUpdated,
    },
  };
};

registerGlobalTimeHook({
  hookId: 'haven_updates',
  handlerVersion: HAVEN_SIMULATION_HANDLER_VERSION,
  run: runHavenUpdatesHook,
});
