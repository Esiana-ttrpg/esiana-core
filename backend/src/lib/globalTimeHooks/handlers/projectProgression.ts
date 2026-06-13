import { registerGlobalTimeHook } from './index.js';
import { runProjectProgression } from '../../projectProgressionService.js';
import type { GlobalTimeHookHandler } from './types.js';

export const PROJECT_PROGRESSION_HANDLER_VERSION = 'project-progression-v1';

const runProjectProgressionHook: GlobalTimeHookHandler = async (tx, context) => {
  const result = await runProjectProgression(tx, context);

  if (result.entitiesUpdated === 0) {
    return {
      handlerVersion: PROJECT_PROGRESSION_HANDLER_VERSION,
      status: 'noop',
      summary: 'No project simulation updates',
      counts: {
        entitiesScanned: result.entitiesScanned,
        entitiesUpdated: 0,
      },
    };
  }

  const summaryParts: string[] = [];
  if (result.progressedCount > 0) {
    summaryParts.push(`${result.progressedCount.toString()} progressed`);
  }
  if (result.stalledCount > 0) {
    summaryParts.push(`${result.stalledCount.toString()} stalled`);
  }
  if (result.completedCount > 0) {
    summaryParts.push(`${result.completedCount.toString()} completed`);
  }

  return {
    handlerVersion: PROJECT_PROGRESSION_HANDLER_VERSION,
    status: result.partial ? 'partial' : 'applied',
    summary: summaryParts.join('; ') || 'Projects updated',
    counts: {
      entitiesScanned: result.entitiesScanned,
      entitiesUpdated: result.entitiesUpdated,
    },
  };
};

registerGlobalTimeHook({
  hookId: 'project_progression',
  handlerVersion: PROJECT_PROGRESSION_HANDLER_VERSION,
  run: runProjectProgressionHook,
});
