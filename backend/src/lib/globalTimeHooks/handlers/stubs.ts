import {
  emptyHookCounts,
  STUB_HANDLER_VERSION,
  type GlobalTimeHookId,
} from '../../../../../shared/globalTimeHooks.js';
import type { GlobalTimeHookHandler, GlobalTimeHookHandlerResult } from './types.js';

function skippedStub(plannedPhase: number): GlobalTimeHookHandlerResult {
  return {
    handlerVersion: STUB_HANDLER_VERSION,
    status: 'skipped',
    summary: `Planned phase ${plannedPhase.toString()} — subsystem not shipped`,
    counts: emptyHookCounts(),
  };
}

export const PHASE_1_STUB_HANDLERS: Record<
  GlobalTimeHookId,
  { plannedPhase: number; run: GlobalTimeHookHandler }
> = {
  cooldown_expiry: {
    plannedPhase: 8,
    run: async () => skippedStub(8),
  },
  project_progression: {
    plannedPhase: 2,
    run: async () => skippedStub(2),
  },
  haven_updates: {
    plannedPhase: 3,
    run: async () => skippedStub(3),
  },
  upkeep: {
    plannedPhase: 4,
    run: async () => skippedStub(4),
  },
  reputation_shifts: {
    plannedPhase: 5,
    run: async () => skippedStub(5),
  },
  event_generation: {
    plannedPhase: 6,
    run: async () => skippedStub(6),
  },
};
