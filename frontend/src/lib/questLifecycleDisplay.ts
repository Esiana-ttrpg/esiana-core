import { NarrativeLifecycleStates } from '@shared/narrativeLifecycle';

export function isQuestLockedForParty(lifecycleState?: string | null): boolean {
  return lifecycleState === NarrativeLifecycleStates.LOCKED;
}

export function shouldShowQuestDmPrivateChip(opts: {
  lifecycleState?: string | null;
  isDMUser: boolean;
  playerPreview: boolean;
}): boolean {
  if (!opts.isDMUser || opts.playerPreview) return false;
  return isQuestLockedForParty(opts.lifecycleState);
}
