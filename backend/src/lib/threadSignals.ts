import {
  computeThreadSignals,
  type ThreadSignalId,
} from '../../../shared/threadSignals.js';
import type { ThreadMetadataFields } from './threadMetadata.js';

export { computeThreadSignals, type ThreadSignalId };

export function computeThreadSignalsFromMetadata(
  thread: ThreadMetadataFields,
  updatedAt: Date,
): ThreadSignalId[] {
  return computeThreadSignals({
    threadKind: thread.threadKind,
    threadStatus: thread.threadStatus,
    payoffPageId: thread.payoffPageId,
    playerSubmitted: thread.playerSubmitted,
    updatedAt,
    lastAdvancedSessionId: thread.lastAdvancedSessionId,
  });
}
