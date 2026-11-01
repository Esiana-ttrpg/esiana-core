import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CampaignCapabilities } from '../../../shared/campaignPolicy/capabilities.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { canViewWikiPage } from './wikiTree.js';

describe('canViewWikiPage', () => {
  it('uses capabilities when provided', () => {
    const partyOnly = new Set([
      CampaignCapabilities.CAMPAIGN_VIEW,
      CampaignCapabilities.WIKI_VIEW_PARTY,
    ]);
    assert.equal(canViewWikiPage('Party', { capabilities: partyOnly }), true);
    assert.equal(canViewWikiPage('DM_Only', { capabilities: partyOnly }), false);
    assert.equal(
      canViewWikiPage('DM_Only', {
        capabilities: new Set([
          CampaignCapabilities.CAMPAIGN_VIEW,
          CampaignCapabilities.NARRATIVE_ELEVATED_VIEW,
        ]),
      }),
      true,
    );
  });

  it('does not treat unknown visibility as public', () => {
    assert.equal(canViewWikiPage('mystery', CampaignMemberRoles.GAMEMASTER), false);
    assert.equal(canViewWikiPage('mystery', CampaignMemberRoles.PARTICIPANT), false);
  });

  it('null viewer can see Public only', () => {
    assert.equal(canViewWikiPage('Public', null), true);
    assert.equal(canViewWikiPage('Party', null), false);
    assert.equal(canViewWikiPage('DM_Only', null), false);
  });

  it('revoked party view hides Party when capabilities omit wiki.view_party', () => {
    assert.equal(
      canViewWikiPage('Party', {
        capabilities: new Set([CampaignCapabilities.CAMPAIGN_VIEW]),
      }),
      false,
    );
  });
});
