import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { adventureViewHref } from './adventureLayout.js';
import {
  campaignAdventureHubPath,
  campaignCategoryChildPath,
  campaignWikiPath,
} from './campaignPaths.js';
import { resolveWorkspaceIndexPathForFolderTitle } from './campaignWorkspaceRoutes.js';

describe('campaign workspace paths', () => {
  it('builds adventure arcs view URL from hub base path', () => {
    const href = adventureViewHref(campaignAdventureHubPath('mario-party-seven'), 'arcs');
    assert.equal(href, '/campaigns/mario-party-seven/adventures?view=arcs');
  });

  it('builds adventure quests view URL with explicit view param', () => {
    const href = adventureViewHref(campaignAdventureHubPath('mario-party-seven'), 'quests');
    assert.equal(href, '/campaigns/mario-party-seven/adventures?view=quests');
  });

  it('resolves quest entity links under adventures workspace', () => {
    const flatPages = [
      {
        id: 'adventure-cat',
        title: 'Adventure',
        parentId: null,
        pathKey: null,
        workspace: null,
      },
      {
        id: 'quest-1',
        title: 'Rainbow Road',
        parentId: 'adventure-cat',
        pathKey: 'rainbow-road',
        workspace: 'ADVENTURES',
      },
    ];

    const href = campaignCategoryChildPath(
      'mario-party-seven',
      'quest-1',
      undefined,
      flatPages,
    );
    assert.equal(href, '/campaigns/mario-party-seven/adventures/rainbow-road');
    assert.equal(
      campaignWikiPath('mario-party-seven', 'quest-1', flatPages),
      href,
    );
    assert.ok(!href.includes('/wiki/'));
  });

  it('maps Characters and Maps folder crumbs to workspace hubs', () => {
    assert.equal(
      resolveWorkspaceIndexPathForFolderTitle('mario-party-seven', 'Characters'),
      '/campaigns/mario-party-seven/characters',
    );
    assert.equal(
      resolveWorkspaceIndexPathForFolderTitle('mario-party-seven', 'Maps'),
      '/campaigns/mario-party-seven/maps',
    );

    const flatPages = [
      {
        id: 'chars-folder',
        title: 'Characters',
        parentId: null,
        pathKey: null,
        workspace: null,
      },
      {
        id: 'mario-id',
        title: 'Mario',
        parentId: 'chars-folder',
        pathKey: 'mario',
        workspace: 'CHARACTERS',
      },
    ];
    assert.equal(
      campaignCategoryChildPath('mario-party-seven', 'chars-folder', undefined, flatPages),
      '/campaigns/mario-party-seven/characters',
    );
  });

  it('uses transitional page id path without flatPages instead of dashboard', () => {
    assert.equal(
      campaignWikiPath('mario-party-seven', 'quest-1'),
      '/campaigns/mario-party-seven/quest-1',
    );
    assert.ok(!campaignWikiPath('mario-party-seven', 'quest-1').includes('/wiki/'));
  });

  it('uses transitional page id when page is missing from flatPages', () => {
    assert.equal(
      campaignCategoryChildPath('mario-party-seven', 'missing-page', undefined, []),
      '/campaigns/mario-party-seven/missing-page',
    );
  });
});
