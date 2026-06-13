import assert from 'node:assert/strict';
import test from 'node:test';
import { CampaignWorkspace } from '@prisma/client';
import { buildWikiPageHref } from './wikiLinkService.js';
import { resolveCanonicalPagePath } from '../../../shared/campaignWorkspaceRoutes.js';
import { resolvePublicPagePath } from './plugins/publicWikiRead.js';

function assertNoLegacyWikiEntityPath(href: string, label: string): void {
  assert.ok(
    !/\/campaigns\/[^/]+\/wiki\/[^/]+/.test(href),
    `${label} must not emit legacy /wiki/:id public paths: ${href}`,
  );
}

test('buildWikiPageHref resolves workspace paths for representative page shapes', () => {
  assert.equal(
    buildWikiPageHref('red-sands', {
      id: 'char-1',
      title: 'Mario',
      parentId: 'chars-folder',
      templateType: 'CHARACTER',
      workspace: CampaignWorkspace.CHARACTERS,
      pathKey: 'mario',
    }),
    '/campaigns/red-sands/characters/mario',
  );

  assert.equal(
    buildWikiPageHref('red-sands', {
      id: 'haven-1',
      title: 'Safehouse',
      parentId: null,
      templateType: 'DOWNTIME_HAVEN',
      workspace: CampaignWorkspace.HAVENS,
      pathKey: 'safehouse',
    }),
    '/campaigns/red-sands/havens/safehouse',
  );

  assert.equal(
    buildWikiPageHref('red-sands', 'cmpabc123', 'DOWNTIME_HAVEN'),
    '/campaigns/red-sands/havens/cmpabc123',
  );

  assert.equal(
    buildWikiPageHref('red-sands', 'unknown-page-id'),
    '/campaigns/red-sands/pages/unknown-page-id',
  );
});

test('buildWikiPageHref and resolveCanonicalPagePath never emit legacy /wiki/:id', () => {
  const cases = [
    buildWikiPageHref('c', {
      id: 'loc-1',
      title: 'Keep',
      parentId: 'loc-root',
      templateType: 'LOCATION',
      workspace: CampaignWorkspace.LOCATIONS,
      pathKey: 'keep',
    }),
    buildWikiPageHref('c', 'page-only-id'),
    resolveCanonicalPagePath(
      'c',
      {
        id: 'maps-folder',
        title: 'Maps',
        parentId: null,
        templateType: 'DEFAULT',
      },
      [],
    ),
    resolveCanonicalPagePath(
      'c',
      {
        id: 'orphan-page',
        title: 'Mystery',
        parentId: null,
        templateType: 'DEFAULT',
      },
      [],
    ),
    resolvePublicPagePath('c', {
      id: 'q-1',
      title: 'Rescue',
      parentId: 'quests-root',
      templateType: 'DEFAULT',
      workspace: CampaignWorkspace.ADVENTURES,
      pathKey: 'rescue',
      metadata: { systemCategoryKey: 'quests' },
    }),
  ];

  for (const href of cases) {
    assertNoLegacyWikiEntityPath(href, 'resolver');
  }
});
