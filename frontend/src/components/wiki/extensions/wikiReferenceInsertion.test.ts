import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { buildWikiLinkHtml } from './WikiLinkExtension.js';
import {
  getRecentReferencePageIds,
  openWikiSuggestion,
  resetRecentReferencesForTests,
  resolveWikiSuggestion,
  resolveWikiSuggestionSections,
  trackRecentReference,
} from './wikiReferenceInsertion.js';
import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';

const entries: WikiLinkIndexEntry[] = [
  {
    pageId: 'p1',
    title: 'Captain Aldren',
    label: 'Captain Aldren',
    normalizedLabel: 'captain aldren',
    templateType: 'DEFAULT',
    inboundLinkCount: 12,
  },
  {
    pageId: 'p2',
    title: 'Vel Astra',
    label: 'Vel Astra',
    normalizedLabel: 'vel astra',
    templateType: 'DEFAULT',
    inboundLinkCount: 3,
  },
  {
    pageId: 'p3',
    title: 'Blackwater Keep',
    label: 'Blackwater Keep',
    normalizedLabel: 'blackwater keep',
    templateType: 'DEFAULT',
    inboundLinkCount: 8,
  },
  {
    pageId: 'p4',
    title: 'Pinned Harbor',
    label: 'Pinned Harbor',
    normalizedLabel: 'pinned harbor',
    templateType: 'DEFAULT',
    inboundLinkCount: 1,
  },
];

describe('wikiReferenceInsertion', () => {
  beforeEach(() => {
    resetRecentReferencesForTests();
  });

  it('openWikiSuggestion normalizes trigger', () => {
    const ctx = openWikiSuggestion({
      active: true,
      query: 'cap',
      from: 1,
      to: 5,
      top: 10,
      left: 20,
      trigger: 'slash',
    });
    assert.equal(ctx.trigger, 'slash');
    assert.equal(ctx.query, 'cap');
  });

  it('resolveWikiSuggestion filters by query', () => {
    const matches = resolveWikiSuggestion('ald', entries);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].pageId, 'p1');
  });

  it('resolveWikiSuggestion returns recent entities first when query empty', () => {
    trackRecentReference('p2');
    trackRecentReference('p3');
    const matches = resolveWikiSuggestion('', entries, {
      recentPageIds: getRecentReferencePageIds(),
      limit: 2,
    });
    assert.deepEqual(
      matches.map((e) => e.pageId),
      ['p3', 'p2'],
    );
  });

  it('resolveWikiSuggestionSections merges tiers in order and dedupes', () => {
    trackRecentReference('p2');
    const sections = resolveWikiSuggestionSections('', entries, {
      recentPageIds: getRecentReferencePageIds(),
      currentPageLinkedIds: ['p1', 'p2'],
      pinnedPageIds: ['p4', 'p1'],
      limit: 8,
    });

    assert.deepEqual(
      sections.map((s) => s.key),
      ['recent', 'onPage', 'pinned', 'frequent'],
    );
    assert.equal(sections[0].label, 'Recent');
    assert.deepEqual(
      sections[0].entries.map((e) => e.pageId),
      ['p2'],
    );
    assert.deepEqual(
      sections[1].entries.map((e) => e.pageId),
      ['p1'],
    );
    assert.deepEqual(
      sections[2].entries.map((e) => e.pageId),
      ['p4'],
    );
    assert.ok(sections[3].entries[0].pageId === 'p1' || sections[3].entries[0].pageId === 'p3');
  });

  it('resolveWikiSuggestionSections uses frequent tier when no session recency', () => {
    const sections = resolveWikiSuggestionSections('', entries, {
      pinnedPageIds: ['p4'],
    });
    const keys = sections.map((s) => s.key);
    assert.ok(keys.includes('pinned'));
    assert.ok(keys.includes('frequent'));
    const frequent = sections.find((s) => s.key === 'frequent');
    assert.equal(frequent?.entries[0].pageId, 'p1');
  });

  it('buildWikiLinkHtml serializes resolved and stub wire forms', () => {
    const resolved = buildWikiLinkHtml({
      targetPageId: 'p1',
      label: 'Captain Aldren',
      resolved: true,
    });
    assert.match(resolved, /data-type="wikiLink"/);
    assert.match(resolved, /data-id="p1"/);
    assert.doesNotMatch(resolved, /data-stub/);

    const stub = buildWikiLinkHtml({
      targetPageId: null,
      label: 'Mystery NPC',
      resolved: false,
    });
    assert.match(stub, /data-stub="true"/);
    assert.match(stub, /data-id=""/);
  });
});
