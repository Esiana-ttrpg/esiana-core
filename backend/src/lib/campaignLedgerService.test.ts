import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignMemberRoles } from '../types/domain.js';
import {
  canContributeToLedger,
  canEditLedgerEntry,
  canManageLedgerSettings,
} from './campaignLedgerService.js';

describe('campaignLedgerService permissions', () => {
  it('allows party members to contribute', () => {
    assert.equal(canContributeToLedger(CampaignMemberRoles.PARTICIPANT), true);
    assert.equal(canContributeToLedger(CampaignMemberRoles.WRITER), true);
    assert.equal(canContributeToLedger(CampaignMemberRoles.GAMEMASTER), true);
    assert.equal(canContributeToLedger(CampaignMemberRoles.OBSERVER), false);
  });

  it('restricts settings to GM/Writer', () => {
    assert.equal(canManageLedgerSettings(CampaignMemberRoles.PARTICIPANT), false);
    assert.equal(canManageLedgerSettings(CampaignMemberRoles.WRITER), true);
  });

  it('allows participants to edit own entries only', () => {
    assert.equal(
      canEditLedgerEntry(CampaignMemberRoles.PARTICIPANT, 'user-a', {
        createdByUserId: 'user-a',
      }),
      true,
    );
    assert.equal(
      canEditLedgerEntry(CampaignMemberRoles.PARTICIPANT, 'user-a', {
        createdByUserId: 'user-b',
      }),
      false,
    );
    assert.equal(
      canEditLedgerEntry(CampaignMemberRoles.WRITER, 'user-a', {
        createdByUserId: 'user-b',
      }),
      true,
    );
  });
});
