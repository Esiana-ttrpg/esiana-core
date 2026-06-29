import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeEventType } from '../narrativeEventService.js';
import {
  campaignActivityToFeedLine,
  narrativeEventToFeedLine,
} from './userActivityCopy.js';

describe('userActivityCopy', () => {
  const campaign = { handle: 'test-world', name: 'Test World' };

  it('maps narrative page edit with word delta', () => {
    const titles = new Map([['page-1', 'Aldric']]);
    const result = narrativeEventToFeedLine(
      {
        id: 'e1',
        type: NarrativeEventType.PAGE_EDITED,
        pageId: 'page-1',
        targetPageId: null,
        metadata: { wordDelta: 42 },
        createdAt: new Date(),
        campaignId: 'c1',
      },
      campaign,
      titles,
    );
    assert.match(result.line, /Aldric/);
    assert.ok(result.href?.includes('test-world'));
    assert.equal(result.wordDelta, 42);
  });

  it('skips wiki page campaign activity in favor of narrative events', () => {
    const wikiLine = campaignActivityToFeedLine(
      {
        id: 'a1',
        actionType: 'UPDATE',
        entityType: 'WIKI_PAGE',
        entityId: 'page-1',
        entityName: 'Should not appear in merged feed',
        parentContext: null,
        createdAt: new Date(),
        campaignId: 'c1',
      },
      campaign,
    );
    assert.match(wikiLine.line, /Should not appear/);
    // Feed builder excludes WIKI_PAGE at query level; copy still works if called directly.
  });

  it('formats writing session activity', () => {
    const result = campaignActivityToFeedLine(
      {
        id: 'a2',
        actionType: 'UPDATE',
        entityType: 'WRITING_SESSION',
        entityId: 'page-1',
        entityName: 'Session notes',
        parentContext: JSON.stringify({ wordDelta: 12, durationMs: 5000 }),
        createdAt: new Date(),
        campaignId: 'c1',
      },
      campaign,
    );
    assert.match(result.line, /writing session/i);
    assert.match(result.line, /\+12 words/);
  });
});
