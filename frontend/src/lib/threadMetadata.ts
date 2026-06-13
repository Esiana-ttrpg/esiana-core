export {
  THREAD_METADATA_VERSION,
  THREAD_KINDS,
  THREAD_STATUSES,
  THREAD_NARRATIVE_WEIGHTS,
  DEFAULT_THREAD_STATUS,
  DEFAULT_THREAD_NARRATIVE_WEIGHT,
  emptyThreadMetadata,
  isThreadMetadataPresent,
  lifecycleToThreadStatus,
  lifecycleTargetForThreadStatusPatch,
  parseThreadMetadata,
  parseThreadMetadataWithWarnings,
  publishedThreadStatusToLifecycleHint,
  type ThreadKind,
  type ThreadMetadataFields,
  type ThreadNarrativeWeight,
  type ThreadStatus,
} from '@shared/threadMetadata';

export {
  THREAD_KIND_DISPLAY_ORDER,
  THREAD_KIND_GROUP_LABELS,
  isAuthoredThreadKind,
  isPlayerTheoryThread,
} from '@shared/threadDisplay';

export {
  allowedThreadStatusesForLifecycle,
  coerceThreadStatusForLifecycle,
  defaultThreadStatusForLifecycle,
  isThreadStatusAllowedForLifecycle,
} from '@shared/threadLifecycleMatrix';

export {
  THREAD_SIGNAL_IDS,
  THREAD_SIGNAL_LABELS,
  type ThreadSignalId,
} from '@shared/threadSignals';
