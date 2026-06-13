import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeLifecycleStates } from '@shared/narrativeLifecycle';
import {
  isQuestLockedForParty,
  shouldShowQuestDmPrivateChip,
} from './questLifecycleDisplay.ts';

describe('isQuestLockedForParty', () => {
  it('returns true for LOCKED', () => {
    assert.equal(isQuestLockedForParty(NarrativeLifecycleStates.LOCKED), true);
  });

  it('returns false for other lifecycle states', () => {
    assert.equal(isQuestLockedForParty(NarrativeLifecycleStates.DISCOVERED), false);
    assert.equal(isQuestLockedForParty(NarrativeLifecycleStates.ACTIVE), false);
    assert.equal(isQuestLockedForParty(undefined), false);
    assert.equal(isQuestLockedForParty(null), false);
  });
});

describe('shouldShowQuestDmPrivateChip', () => {
  it('shows for GM with LOCKED quest', () => {
    assert.equal(
      shouldShowQuestDmPrivateChip({
        lifecycleState: NarrativeLifecycleStates.LOCKED,
        isDMUser: true,
        playerPreview: false,
      }),
      true,
    );
  });

  it('hides for discovered quests', () => {
    assert.equal(
      shouldShowQuestDmPrivateChip({
        lifecycleState: NarrativeLifecycleStates.DISCOVERED,
        isDMUser: true,
        playerPreview: false,
      }),
      false,
    );
  });

  it('hides in player preview', () => {
    assert.equal(
      shouldShowQuestDmPrivateChip({
        lifecycleState: NarrativeLifecycleStates.LOCKED,
        isDMUser: true,
        playerPreview: true,
      }),
      false,
    );
  });

  it('hides for non-DM users', () => {
    assert.equal(
      shouldShowQuestDmPrivateChip({
        lifecycleState: NarrativeLifecycleStates.LOCKED,
        isDMUser: false,
        playerPreview: false,
      }),
      false,
    );
  });
});
