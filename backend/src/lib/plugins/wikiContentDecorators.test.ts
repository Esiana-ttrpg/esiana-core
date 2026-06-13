import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyWikiContentDecorators,
  clearWikiContentDecorators,
  registerWikiContentDecorator,
} from './wikiContentDecorators.js';

describe('wikiContentDecorators', () => {
  it('merges metadata and pluginDisplay only', () => {
    clearWikiContentDecorators();
    registerWikiContentDecorator('demo', (page) => ({
      title: 'Hijacked title',
      metadata: { badge: 'new' },
      pluginDisplay: { ribbon: 'Demo' },
    }));

    const page = {
      id: 'p1',
      title: 'Original',
      metadata: { existing: true },
      blocks: [{ type: 'text', content: 'keep' }],
    };

    const result = applyWikiContentDecorators(page, {
      campaignId: 'c1',
      role: 'DM',
    });

    assert.equal(result.title, 'Original');
    assert.deepEqual(result.blocks, page.blocks);
    assert.deepEqual(result.metadata, { existing: true, badge: 'new' });
    assert.deepEqual(result.pluginDisplay, { ribbon: 'Demo' });
    clearWikiContentDecorators();
  });

  it('continues when a decorator throws', () => {
    clearWikiContentDecorators();
    registerWikiContentDecorator('bad', () => {
      throw new Error('boom');
    });
    registerWikiContentDecorator('good', () => ({
      metadata: { ok: true },
    }));

    const result = applyWikiContentDecorators(
      { id: 'p1', metadata: {} },
      { campaignId: 'c1', role: null },
    );

    assert.deepEqual(result.metadata, { ok: true });
    clearWikiContentDecorators();
  });
});
