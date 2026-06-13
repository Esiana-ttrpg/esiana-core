import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCampaignLinks } from '../../../shared/chronologyConvergence.js';
import { ChronologyDomainKind } from '../../../shared/chronologyTypes.js';
import type { CanonicalChronologyAnchor } from '../../../shared/chronologyTypes.js';

function loreAnchor(pageId: string): CanonicalChronologyAnchor {
  return {
    id: `lore:${pageId}`,
    domain: ChronologyDomainKind.LORE_REFERENCE,
    sourceEntityType: 'wiki_page',
    sourceEntityId: pageId,
    subEntityId: null,
    instant: { epochMinute: '1', dateParts: null },
    title: 'Lore',
    summary: null,
    domainPayload: {
      domain: ChronologyDomainKind.LORE_REFERENCE,
      payload: {
        pageId,
        aliasStableKey: 'alias-1',
        aliasName: 'Alias',
        bound: 'era_start',
      },
    },
    sessionLink: null,
  };
}

test('buildCampaignLinks uses transitional wiki page path when resolver is absent', () => {
  const links = buildCampaignLinks(loreAnchor('lore-page-1'), {
    campaignHandle: 'winter',
  });
  const wiki = links.find((link) => link.hrefKind === 'wiki_page');
  assert.ok(wiki);
  assert.equal(wiki.path, '/campaigns/winter/lore-page-1');
  assert.ok(!wiki.path.includes('/dashboard'));
});

test('buildCampaignLinks prefers resolved workspace-first wiki paths', () => {
  const links = buildCampaignLinks(loreAnchor('lore-page-1'), {
    campaignHandle: 'winter',
    resolveWikiPagePath: () => '/campaigns/winter/characters/hero',
  });
  const wiki = links.find((link) => link.hrefKind === 'wiki_page');
  assert.equal(wiki?.path, '/campaigns/winter/characters/hero');
});
