import assert from 'node:assert/strict';
import test from 'node:test';
import { wikiPageToMarkdown } from './wikiPageToMarkdown.js';

const assetLookup = {
  resolveMediaFilename: (key: string) =>
    key === 'asset-1' ? 'asset-1.png' : null,
};

const pageLookup = {
  resolveTitle: (pageId: string) =>
    pageId === 'target-page' ? 'Target Page' : null,
};

test('wikiPageToMarkdown concatenates text blocks and rewrites mentions', () => {
  const result = wikiPageToMarkdown(
    {
      id: 'page-1',
      title: 'Source',
      parentId: null,
      templateType: 'DEFAULT',
      visibility: 'Party',
      tagNames: ['quest'],
      metadata: null,
      blocks: [
        {
          id: 'b1',
          type: 'text-tiptap',
          content: {
            markdown:
              'See <span data-type="mention" data-id="target-page" data-label="Target Page">[[Target Page]]</span>.',
          },
        },
        {
          id: 'b2',
          type: 'text-tiptap',
          content: { markdown: 'Second paragraph.' },
        },
      ],
    },
    'sovereign/wiki/Source.md',
    null,
    assetLookup,
    pageLookup,
  );

  assert.match(result.markdown, /esiana_id: page-1/);
  assert.match(result.markdown, /tags:/);
  assert.match(result.markdown, /\[\[Target Page\]\]/);
  assert.match(result.markdown, /Second paragraph/);
  assert.match(result.markdown, /\n---\n/);
});

test('wikiPageToMarkdown rewrites asset references to media paths', () => {
  const result = wikiPageToMarkdown(
    {
      id: 'page-2',
      title: 'Illustrated Lore',
      parentId: null,
      templateType: 'DEFAULT',
      visibility: 'Party',
      tagNames: [],
      metadata: null,
      blocks: [
        {
          id: 'b1',
          type: 'text-tiptap',
          content: {
            markdown: '![](/api/assets/asset-1)',
          },
        },
      ],
    },
    'sovereign/wiki/Illustrated-Lore.md',
    null,
    assetLookup,
    pageLookup,
  );

  assert.match(result.markdown, /!\[\]\(media\/asset-1\.png\)/);
});

test('wikiPageToMarkdown exports quest and system category metadata', () => {
  const result = wikiPageToMarkdown(
    {
      id: 'quest-1',
      title: 'Find the Relic',
      parentId: 'quests-root',
      templateType: 'DEFAULT',
      visibility: 'Party',
      tagNames: [],
      metadata: {
        systemCategoryKey: 'quests',
        questStatus: 'ACTIVE',
        questGiverId: 'npc-1',
        rewardsText: '100 gold',
        dmRewardsText: 'cursed blade',
      },
      blocks: [],
    },
    'sovereign/wiki/Find the Relic.md',
    'quests-root',
    assetLookup,
    pageLookup,
  );

  assert.match(result.markdown, /systemCategoryKey: quests/);
  assert.match(result.markdown, /questStatus: ACTIVE/);
  assert.match(result.markdown, /questGiverId: npc-1/);
  assert.match(result.markdown, /rewardsText: 100 gold/);
  assert.match(result.markdown, /dmRewardsText: cursed blade/);
});
