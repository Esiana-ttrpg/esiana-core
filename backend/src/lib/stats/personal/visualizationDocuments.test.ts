import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignCapabilities } from '../../../../../shared/campaignPolicy/capabilities.js';
import { selectVisibleVisualizationDocuments } from './queryPersonalStatistics.js';

describe('selectVisibleVisualizationDocuments', () => {
  const pages = [
    {
      id: 'party-page',
      title: 'Harbor notes',
      pathKey: 'harbor-notes',
      parentId: 'loc-root',
      templateType: 'DEFAULT',
      workspace: 'LOCATIONS',
      visibility: 'Party',
      campaignId: 'camp-1',
      handle: 'demo',
    },
    {
      id: 'character-page',
      title: 'Mira Vale',
      pathKey: 'mira-vale',
      parentId: 'char-root',
      templateType: 'DEFAULT',
      workspace: 'CHARACTERS',
      visibility: 'Party',
      campaignId: 'camp-1',
      handle: 'demo',
    },
    {
      id: 'gm-page',
      title: 'Secret ledger',
      pathKey: 'secret-ledger',
      parentId: null,
      templateType: 'DEFAULT',
      workspace: 'CUSTOM',
      visibility: 'DM_Only',
      campaignId: 'camp-1',
      handle: 'demo',
    },
  ];

  it('keeps only pages the viewer capabilities can see', () => {
    const partyOnly = new Map([
      [
        'camp-1',
        {
          capabilities: new Set([
            CampaignCapabilities.CAMPAIGN_VIEW,
            CampaignCapabilities.WIKI_VIEW_PARTY,
          ]),
        },
      ],
    ]);
    const visible = selectVisibleVisualizationDocuments(pages, partyOnly);
    assert.equal(visible.has('party-page'), true);
    assert.equal(visible.get('party-page')?.title, 'Harbor notes');
    assert.equal(visible.has('gm-page'), false);
  });

  it('uses workspace entity routes instead of /pages/', () => {
    const partyOnly = new Map([
      [
        'camp-1',
        {
          capabilities: new Set([
            CampaignCapabilities.CAMPAIGN_VIEW,
            CampaignCapabilities.WIKI_VIEW_PARTY,
          ]),
        },
      ],
    ]);
    const visible = selectVisibleVisualizationDocuments(pages, partyOnly);
    assert.equal(
      visible.get('party-page')?.href,
      '/campaigns/demo/locations/harbor-notes',
    );
    assert.equal(
      visible.get('character-page')?.href,
      '/campaigns/demo/characters/mira-vale',
    );
    assert.equal(visible.get('party-page')?.href.includes('/pages/'), false);
  });

  it('does not treat campaign membership as enough for GM-only pages', () => {
    const membershipOnly = new Map([
      ['camp-1', { capabilities: new Set([CampaignCapabilities.CAMPAIGN_VIEW]) }],
    ]);
    const visible = selectVisibleVisualizationDocuments(pages, membershipOnly);
    assert.equal(visible.size, 0);
  });
});
