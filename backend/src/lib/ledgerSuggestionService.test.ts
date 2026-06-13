import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignMemberRoles } from '../types/domain.js';
import { canManageLedgerSettings } from './campaignLedgerService.js';
import { mapEntryKindFromImpactKind } from './ledgerSuggestionService.js';

describe('ledgerSuggestionService', () => {
  it('maps treasury impact kinds to ledger entry kinds', () => {
    assert.equal(mapEntryKindFromImpactKind('credit'), 'credit');
    assert.equal(mapEntryKindFromImpactKind('debit'), 'debit');
  });

  it('restricts accept/dismiss to GM and Writer', () => {
    assert.equal(canManageLedgerSettings(CampaignMemberRoles.GAMEMASTER), true);
    assert.equal(canManageLedgerSettings(CampaignMemberRoles.WRITER), true);
    assert.equal(canManageLedgerSettings(CampaignMemberRoles.PARTICIPANT), false);
    assert.equal(canManageLedgerSettings(CampaignMemberRoles.OBSERVER), false);
    assert.equal(canManageLedgerSettings(null), false);
  });
});
