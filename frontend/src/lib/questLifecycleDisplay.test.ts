import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeLifecycleStates } from '@shared/narrativeLifecycle';
import {
  isQuestLockedForParty,
  questLifecycleDisplayLabel,
  shouldShowQuestHiddenLifecycleChip,
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

describe('questLifecycleDisplayLabel', () => {
  it('maps lifecycle states to GM-facing labels', () => {
    assert.equal(questLifecycleDisplayLabel(NarrativeLifecycleStates.LOCKED), 'Hidden');
    assert.equal(questLifecycleDisplayLabel(NarrativeLifecycleStates.DISCOVERED), 'Available');
    assert.equal(questLifecycleDisplayLabel(NarrativeLifecycleStates.ACTIVE), 'Active');
  });
});

describe('shouldShowQuestHiddenLifecycleChip', () => {
  it('shows for GM with LOCKED quest', () => {
    assert.equal(
      shouldShowQuestHiddenLifecycleChip({
        lifecycleState: NarrativeLifecycleStates.LOCKED,
        isDMUser: true,
        playerPreview: false,
      }),
      true,
    );
  });

  it('hides for discovered quests', () => {
    assert.equal(
      shouldShowQuestHiddenLifecycleChip({
        lifecycleState: NarrativeLifecycleStates.DISCOVERED,
        isDMUser: true,
        playerPreview: false,
      }),
      false,
    );
  });

  it('hides in player preview', () => {
    assert.equal(
      shouldShowQuestHiddenLifecycleChip({
        lifecycleState: NarrativeLifecycleStates.LOCKED,
        isDMUser: true,
        playerPreview: true,
      }),
      false,
    );
  });

  it('hides for non-DM users', () => {
    assert.equal(
      shouldShowQuestHiddenLifecycleChip({
        lifecycleState: NarrativeLifecycleStates.LOCKED,
        isDMUser: false,
        playerPreview: false,
      }),
      false,
    );
  });
});
