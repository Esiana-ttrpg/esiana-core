import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractUnresolvedWikilinksFromBlocks,
  extractWikiEdgesFromBlocks,
  extractWikiLinkTargetIdsFromBlocks,
  extractAllWikiTargetsFromBlock,
  extractSocialMentionsFromBlocks,
  rewriteMarkdownForPageRename,
} from './wikiLinkExtract.js';

describe('wikiLinkExtract', () => {
  const blocks = (markdown: string) => [{ type: 'text-tiptap', content: { markdown } }];

  it('retains ordered attributes, greedy repeated attributes and malformed quote semantics', () => {
    assert.deepEqual(extractWikiEdgesFromBlocks(blocks(
      'data-type="wikiLink" data-id="first" data-id="last" data-label="Éowyn 北"',
    )), [{ targetPageId: 'last', aliasText: 'Éowyn 北' }]);
    assert.deepEqual(extractWikiEdgesFromBlocks(blocks(
      'data-type="mention" data-id="page>id" data-label="Mira>Archive"',
    )), [{ targetPageId: 'page>id', aliasText: 'Mira>Archive' }]);
    for (const input of [
      'data-type="wikiLink" data-label="Mira" data-id="id"',
      "data-type='wikiLink' data-id='id' data-label='Mira'",
      'data-type="wikiLink">data-id="id" data-label="Mira"',
      'data-type="wikiLink" data-id="id" data-label="unclosed',
    ]) assert.deepEqual(extractWikiEdgesFromBlocks(blocks(input)), []);
  });

  it('keeps social mention defaults and the legacy greedy optional capture behavior', () => {
    assert.deepEqual(extractSocialMentionsFromBlocks(blocks(
      'data-type="socialMention" data-mention-type="CHARACTER" data-target-user-id="u" data-identity-page-id="p" data-label="Ash"',
    )), [{ mentionType: 'CHARACTER', targetUserId: undefined, identityPageId: undefined, label: 'Ash' }]);
    assert.deepEqual(extractSocialMentionsFromBlocks(blocks(
      'data-type="socialMention" data-mention-type="USER" data-target-user-id="u>id" data-label="Mira"',
    )), [{ mentionType: 'USER', targetUserId: 'u>id', identityPageId: undefined, label: 'Mira' }]);
  });

  it('preserves nested bracket syntax, multiple links, alias deduplication and stubs', () => {
    assert.deepEqual(extractUnresolvedWikilinksFromBlocks(blocks(
      '[[[Mira]]] [[mira]] [[Éowyn|北]] [[]] [[unclosed',
    )), [
      { rawText: 'Mira', normalizedText: 'mira', occurrenceCount: 2 },
      { rawText: 'Éowyn|北', normalizedText: 'éowyn北', occurrenceCount: 1 },
    ]);
    assert.deepEqual(extractAllWikiTargetsFromBlock(blocks('[[Mira]]')[0]), [
      { targetPageId: '', label: 'Mira', isBrokenStub: true },
    ]);
    // ASCII case folding must not broaden the old non-Unicode /i syntax.
    assert.equal(extractUnresolvedWikilinksFromBlocks(blocks(
      '<SPAN data-type="WIKILINK">[[Mira]]',
    )).length, 0);
    assert.equal(extractUnresolvedWikilinksFromBlocks(blocks(
      '<span data-type="wiKiLink">[[Mira]]',
    )).length, 1);
  });

  it('renames supported paths and span labels without changing custom aliases or plural-path syntax', () => {
    const markdown = '[Old](/c/demo/wiki/page-1) [Custom](/campaign/demo/wiki/page-1) ' +
      '[Old](/campaigns/demo/wiki/page-1) ' +
      '<span data-type="wikiLink" data-id="page-1" data-label="Old">[[Old]]</span>';
    assert.equal(rewriteMarkdownForPageRename(markdown, 'page-1', 'Old', 'Éowyn 北'),
      '[Éowyn 北](/c/demo/wiki/page-1) [Custom](/campaign/demo/wiki/page-1) ' +
      '[Old](/campaigns/demo/wiki/page-1) ' +
      '<span data-type="wikiLink" data-id="page-1" data-label="Éowyn 北">[[Éowyn 北]]</span>');
  });

  it('inserts dollar-sign titles literally in Markdown links, span labels and bodies', () => {
    const title = "$& $$ $1 $2 $` $' $01";
    const input = '[Old](/c/demo/wiki/page-1) ' +
      '<span data-type="wikiLink" data-id="page-1" data-label="Old">[[Old]]</span>';
    assert.equal(rewriteMarkdownForPageRename(input, 'page-1', 'Old', title),
      `[${title}](/c/demo/wiki/page-1) ` +
      `<span data-type="wikiLink" data-id="page-1" data-label="${title}">[[${title}]]</span>`);
  });

  it('handles long unmatched delimiters and repeated attribute prefixes deterministically', () => {
    for (const markdown of [
      '['.repeat(100_000),
      'data-type="wikiLink" data-id="id" '.repeat(5_000),
      'data-type="socialMention" data-mention-type="USER" '.repeat(5_000),
      '<span data-type="wikiLink" data-id="id" '.repeat(5_000),
    ]) {
      assert.deepEqual(extractWikiEdgesFromBlocks(blocks(markdown)), []);
      assert.deepEqual(extractSocialMentionsFromBlocks(blocks(markdown)), []);
      assert.equal(rewriteMarkdownForPageRename(markdown, 'id', 'Old', 'New'), markdown);
    }
  });

  it('extracts wikiLink span targets with alias text', () => {
    const edges = extractWikiEdgesFromBlocks([
      {
        type: 'text-tiptap',
        content: {
          markdown:
            '<span data-type="wikiLink" data-id="page-a" data-label="Blackwater Keep">[[Blackwater Keep]]</span>',
        },
      },
    ]);
    assert.equal(edges.length, 1);
    assert.equal(edges[0]?.targetPageId, 'page-a');
    assert.equal(edges[0]?.aliasText, 'Blackwater Keep');
  });

  it('collects unresolved wikilink stubs', () => {
    const unresolved = extractUnresolvedWikilinksFromBlocks([
      {
        type: 'text-tiptap',
        content: {
          markdown:
            '<span data-type="wikiLink" data-id="" data-label="Ash King" data-stub="true">[[Ash King]]</span>',
        },
      },
    ]);
    assert.equal(unresolved.length, 1);
    assert.equal(unresolved[0]?.rawText, 'Ash King');
  });

  it('extracts wiki, character, and event paths', () => {
    const ids = extractWikiLinkTargetIdsFromBlocks([
      {
        type: 'text-tiptap',
        content: {
          markdown: [
            '[Wiki](/campaigns/my-campaign/wiki/page-wiki)',
            '[Hero](/campaigns/my-campaign/characters/char-1)',
            '[Event](/campaigns/my-campaign/event-evt-1)',
          ].join('\n'),
        },
      },
    ]);
    assert.deepEqual(new Set(ids), new Set(['page-wiki', 'char-1', 'event-evt-1']));
  });
});
