import {
  NarrativeLifecycleStates,
  questLifecycleDisplayLabel,
  QUEST_LIFECYCLE_EDITOR_OPTIONS,
} from '@shared/narrativeLifecycle';

export { questLifecycleDisplayLabel, QUEST_LIFECYCLE_EDITOR_OPTIONS };

export const QUEST_HIDDEN_LIFECYCLE_TOOLTIP =
  'Not visible on party quest surfaces — change Quest status to Available.';

export function isQuestLockedForParty(lifecycleState?: string | null): boolean {
  return lifecycleState === NarrativeLifecycleStates.LOCKED;
}

export function shouldShowQuestHiddenLifecycleChip(opts: {
  lifecycleState?: string | null;
  isDMUser: boolean;
  playerPreview: boolean;
}): boolean {
  if (!opts.isDMUser || opts.playerPreview) return false;
  return isQuestLockedForParty(opts.lifecycleState);
}
