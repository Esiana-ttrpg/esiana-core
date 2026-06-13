import { registerGlobalTimeHook } from './index.js';
import {
  emitWorldEventSuggestions,
  WORLD_EVENT_PROMPTS_HANDLER_VERSION,
  WORLD_PRESSURE_PAUSED_HOOK_SUMMARY,
} from '../../worldEventSuggestionService.js';
import type { GlobalTimeHookHandler } from './types.js';

const runEventGenerationHook: GlobalTimeHookHandler = async (tx, context) => {
  const result = await emitWorldEventSuggestions(tx, context);

  if (result.paused) {
    return {
      handlerVersion: WORLD_EVENT_PROMPTS_HANDLER_VERSION,
      status: 'noop',
      summary: WORLD_PRESSURE_PAUSED_HOOK_SUMMARY,
      counts: {
        entitiesScanned: 0,
        eventsGenerated: 0,
      },
    };
  }

  if (result.suggestionsCreated === 0) {
    return {
      handlerVersion: WORLD_EVENT_PROMPTS_HANDLER_VERSION,
      status: 'noop',
      summary: 'No world event prompts',
      counts: {
        entitiesScanned: result.entitiesScanned,
        eventsGenerated: 0,
      },
    };
  }

  return {
    handlerVersion: WORLD_EVENT_PROMPTS_HANDLER_VERSION,
    status: 'applied',
    summary: `${result.suggestionsCreated.toString()} world event prompt(s) queued`,
    counts: {
      entitiesScanned: result.entitiesScanned,
      eventsGenerated: result.suggestionsCreated,
    },
  };
};

registerGlobalTimeHook({
  hookId: 'event_generation',
  handlerVersion: WORLD_EVENT_PROMPTS_HANDLER_VERSION,
  run: runEventGenerationHook,
});
