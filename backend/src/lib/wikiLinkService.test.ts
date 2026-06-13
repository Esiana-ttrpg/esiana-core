import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WikiVisibility } from '../types/domain.js';
import { buildVisibleBreadcrumbLabel, buildWikiPageHref } from './wikiLinkService.js';

describe('buildVisibleBreadcrumbLabel', () => {
  const parentById = new Map([
    ['public-child', { id: 'public-child', title: 'Public Child', parentId: 'dm-parent' }],
    ['dm-parent', { id: 'dm-parent', title: 'Secret Region', parentId: 'world' }],
    ['world', { id: 'world', title: 'World', parentId: null }],
  ]);
  const visibilityById = new Map([
    ['public-child', WikiVisibility.PARTY],
    ['dm-parent', WikiVisibility.DM_ONLY],
    ['world', WikiVisibility.PUBLIC],
  ]);

  it('omits DM_ONLY ancestor titles for players', () => {
    const label = buildVisibleBreadcrumbLabel(
      'public-child',
      'Public Child',
      parentById,
      visibilityById,
      false,
    );
    assert.equal(label, 'World › Public Child');
    assert.ok(!label.includes('Secret Region'));
  });

  it('includes DM_ONLY ancestors for elevated roles', () => {
    const label = buildVisibleBreadcrumbLabel(
      'public-child',
      'Public Child',
      parentById,
      visibilityById,
      true,
    );
    assert.equal(label, 'Secret Region › World › Public Child');
  });
});

describe('buildWikiPageHref', () => {
  it('resolves haven and project pages from templateType and pathKey', () => {
    assert.equal(
      buildWikiPageHref('my-campaign', {
        id: 'haven-1',
        templateType: 'DOWNTIME_HAVEN',
        pathKey: 'safehouse',
      }),
      '/campaigns/my-campaign/havens/safehouse',
    );
    assert.equal(
      buildWikiPageHref('my-campaign', {
        id: 'project-1',
        templateType: 'DOWNTIME_PROJECT',
        pathKey: 'rebuild-the-dock',
      }),
      '/campaigns/my-campaign/projects/rebuild-the-dock',
    );
  });

  it('falls back to page id when pathKey is missing', () => {
    assert.equal(
      buildWikiPageHref('my-campaign', 'cmpabc123', 'DOWNTIME_HAVEN'),
      '/campaigns/my-campaign/havens/cmpabc123',
    );
  });

  it('never emits legacy /wiki/:id paths', () => {
    const href = buildWikiPageHref('my-campaign', 'page-only-id');
    assert.ok(!href.includes('/wiki/'));
    assert.equal(href, '/campaigns/my-campaign/pages/page-only-id');
  });
});
