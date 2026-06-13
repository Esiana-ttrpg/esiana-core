export {
  THREAD_METADATA_VERSION,
  THREAD_KINDS,
  THREAD_STATUSES,
  DEFAULT_THREAD_STATUS,
  emptyThreadMetadata,
  isThreadMetadataPresent,
  lifecycleToThreadStatus,
  lifecycleTargetForThreadStatusPatch,
  parseThreadMetadata,
  parseThreadMetadataWithWarnings,
  publishedThreadStatusToLifecycleHint,
  publishedThreadStatusToLifecycleTarget,
  type ParseThreadMetadataResult,
  type ThreadKind,
  type ThreadMetadataFields,
  type ThreadNarrativeWeight,
  type ThreadStatus,
} from '../../../shared/threadMetadata.js';

import {
  parseThreadMetadata,
  type ThreadMetadataFields,
  type ThreadStatus,
} from '../../../shared/threadMetadata.js';

const THREAD_METADATA_KEYS = [
  'threadMetadataVersion',
  'threadKind',
  'threadStatus',
  'narrativeWeight',
  'relatedPageIds',
  'introducedSessionId',
  'lastAdvancedSessionId',
  'resolvedSessionId',
  'payoffPageId',
  'playerSubmitted',
  'sortOrder',
] as const;

export function mergeThreadMetadata(
  existing: unknown,
  patch: Partial<ThreadMetadataFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseThreadMetadata(base);
  const merged: ThreadMetadataFields = { ...parsed, ...patch };

  if (merged.threadKind === 'theory') {
    merged.playerSubmitted = true;
    if (merged.threadStatus !== 'RESOLVED' && merged.threadStatus !== 'ABANDONED') {
      merged.threadStatus = 'OPEN';
    }
  }

  if (merged.threadStatus === 'RESOLVED' && !merged.resolvedSessionId) {
    // Caller may pass resolvedSessionId explicitly; otherwise left null until hook stamps it
  }

  return {
    ...base,
    threadMetadataVersion: merged.threadMetadataVersion,
    threadKind: merged.threadKind,
    threadStatus: merged.threadStatus,
    narrativeWeight: merged.narrativeWeight,
    relatedPageIds: merged.relatedPageIds,
    introducedSessionId: merged.introducedSessionId,
    lastAdvancedSessionId: merged.lastAdvancedSessionId,
    resolvedSessionId: merged.resolvedSessionId,
    payoffPageId: merged.payoffPageId,
    playerSubmitted: merged.playerSubmitted,
    sortOrder: merged.sortOrder,
  };
}

export function stampThreadSessionAnchors(
  merged: ThreadMetadataFields,
  patch: Partial<ThreadMetadataFields>,
  options?: { advancedSessionId?: string | null },
): ThreadMetadataFields {
  const next = { ...merged };
  if (patch.threadStatus === 'RESOLVED' && !next.resolvedSessionId) {
    if (options?.advancedSessionId) {
      next.resolvedSessionId = options.advancedSessionId;
    }
  }
  if (
    patch.threadStatus !== undefined ||
    patch.threadKind !== undefined ||
    options?.advancedSessionId
  ) {
    if (options?.advancedSessionId) {
      next.lastAdvancedSessionId = options.advancedSessionId;
    }
  }
  return next;
}

export function sanitizeThreadMetadataForRole(
  parsed: ThreadMetadataFields,
  _canManage: boolean,
): ThreadMetadataFields {
  return parsed;
}

export function hasThreadMetadataPatch(body: Record<string, unknown>): boolean {
  return THREAD_METADATA_KEYS.some((key) => key in body);
}

export function resolveThreadMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasThreadMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasThreadMetadataPatch(body)) {
    return body;
  }
  return null;
}
