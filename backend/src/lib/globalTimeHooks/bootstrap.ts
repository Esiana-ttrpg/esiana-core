import './handlers/index.js';
import './handlers/cooldownExpiry.js';
import './handlers/projectProgression.js';
import './handlers/havenUpdates.js';
import './handlers/upkeep.js';
import './handlers/reputationShifts.js';
import './handlers/eventGeneration.js';

/** Ensures Phase 1 stub handlers are registered at startup. */
export function bootstrapGlobalTimeHooks(): void {
  // Import side-effect populates the handler registry lazily on first orchestrator run.
}
