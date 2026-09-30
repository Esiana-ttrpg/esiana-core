import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCommandContext } from './resolveCommandContext.js';

describe('resolveCommandContext', () => {
  it('derives workspaceSegment from pathname', () => {
    const ctx = resolveCommandContext({
      campaignHandle: 'demo',
      campaignId: 'c1',
      pathname: '/campaigns/demo/characters/yuna',
      can: () => true,
      resolveCategoryPageId: () => undefined,
      activePage: null,
    });
    assert.equal(ctx.workspaceSegment, 'characters');
    assert.equal(ctx.campaignHandle, 'demo');
    assert.equal(ctx.activePage, null);
  });

  it('passes through activePage', () => {
    const page = {
      pageId: 'p1',
      title: 'Yuna',
      href: '/campaigns/demo/characters/yuna',
      canEdit: true,
      isEditing: false,
    };
    const ctx = resolveCommandContext({
      campaignHandle: 'demo',
      campaignId: null,
      pathname: '/campaigns/demo/characters/yuna',
      can: () => false,
      resolveCategoryPageId: () => undefined,
      activePage: page,
    });
    assert.equal(ctx.activePage, page);
  });
});
