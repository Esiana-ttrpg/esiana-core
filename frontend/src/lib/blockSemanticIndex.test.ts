import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SEMANTIC_BLOCK_TYPES } from './blockCapabilities.ts';
import {
  buildBlockSemanticIndex,
  buildPageSemanticIndex,
  extractWikiReferenceIds,
  getBlockSemanticIndex,
  joinIndexParts,
  normalizeBlockSemanticIndex,
  normalizeKeywords,
  plainTextFromMarkdown,
  semanticAdapterRegistry,
  SEMANTIC_INDEX_TEXT_CAP,
  SEMANTIC_KEYWORD_MAX_COUNT,
  SEMANTIC_KEYWORD_MAX_LENGTH,
  SEMANTIC_REFERENCE_MAX_COUNT,
} from './blockSemanticIndex.ts';
import { characterHeroAdapter } from './blockSemanticIndex/adapters/characterHero.ts';
import { orgHeroAdapter } from './blockSemanticIndex/adapters/orgHero.ts';
import { proseBlockAdapter } from './blockSemanticIndex/adapters/prose.ts';
import type { WikiPageBlock } from '@/types/wiki';

function baseBlock(overrides: Partial<WikiPageBlock> & Pick<WikiPageBlock, 'type'>): WikiPageBlock {
  return {
    id: 'block-1',
    x: 0,
    y: 0,
    w: 12,
    h: 1,
    content: {},
    isPrivate: false,
    ...overrides,
  };
}

describe('blockSemanticIndex', () => {
  it('extracts biography markdown text and bracket labels', () => {
    const block: WikiPageBlock = {
      id: 'bio-1',
      type: 'text-biography',
      x: 0,
      y: 0,
      w: 12,
      h: 1,
      content: { markdown: 'Met [[Captain Aldric]] in the ruins.' },
      isPrivate: false,
    };
    const index = buildBlockSemanticIndex(block);
    assert.ok(index.semanticIndexText.includes('Met'));
    assert.ok(index.semanticIndexText.includes('ruins'));
    assert.ok(index.semanticKeywords.includes('Captain Aldric'));
  });

  it('joinIndexParts joins with double newlines and normalizes whitespace', () => {
    assert.equal(joinIndexParts(['  alpha  ', '', 'beta']), 'alpha\n\nbeta');
  });

  it('normalizeKeywords preserves case and dedupes case-insensitively', () => {
    const keywords = normalizeKeywords(['Dragon', 'dragon', ' DRAGON ', 'Elf']);
    assert.deepEqual(keywords, ['Dragon', 'Elf']);
  });

  it('normalizeKeywords truncates overlong tokens and caps count', () => {
    const longToken = 'a'.repeat(SEMANTIC_KEYWORD_MAX_LENGTH + 20);
    assert.equal(normalizeKeywords([longToken])[0]?.length, SEMANTIC_KEYWORD_MAX_LENGTH);

    const many = Array.from({ length: SEMANTIC_KEYWORD_MAX_COUNT + 5 }, (_, i) => `token-${i}`);
    assert.equal(normalizeKeywords(many).length, SEMANTIC_KEYWORD_MAX_COUNT);
  });

  it('extracts wiki reference ids from raw markdown before text stripping', () => {
    const markdown =
      'See <span data-type="wikiLink" data-id="page-abc" data-label="Aldric">[[Aldric]]</span> and /campaigns/handle/wiki/page-xyz';
    const refs = extractWikiReferenceIds(markdown);
    assert.ok(refs.includes('page-abc'));
    assert.ok(refs.includes('page-xyz'));
    const plain = plainTextFromMarkdown(markdown);
    assert.ok(!plain.includes('page-abc'));
    assert.ok(refs.length >= 2);
  });

  it('normalizeBlockSemanticIndex enforces per-block caps', () => {
    const normalized = normalizeBlockSemanticIndex({
      semanticIndexText: 'a'.repeat(SEMANTIC_INDEX_TEXT_CAP + 100),
      semanticKeywords: Array.from({ length: 80 }, (_, i) => `kw-${i}`),
      semanticReferences: Array.from({ length: 200 }, (_, i) => `ref-${i}`),
    });
    assert.equal(normalized.semanticIndexText.length, SEMANTIC_INDEX_TEXT_CAP);
    assert.equal(normalized.semanticKeywords.length, SEMANTIC_KEYWORD_MAX_COUNT);
    assert.equal(normalized.semanticReferences.length, SEMANTIC_REFERENCE_MAX_COUNT);
  });

  it('registry covers every SemanticBlockType', () => {
    for (const blockType of SEMANTIC_BLOCK_TYPES) {
      assert.ok(
        typeof semanticAdapterRegistry[blockType] === 'function',
        `missing adapter for ${blockType}`,
      );
    }
  });

  it('org hero adapter includes headquartersId in references', () => {
    const index = getBlockSemanticIndex(
      baseBlock({ type: 'entity-org-hero', id: 'org-hero' }),
      { headquartersId: 'hq-page-1', orgType: 'Guild' },
    );
    assert.ok(index.semanticReferences.includes('hq-page-1'));
    assert.ok(index.semanticIndexText.includes('Guild'));
  });

  it('scene properties adapter includes participantPageIds in references', () => {
    const index = getBlockSemanticIndex(
      baseBlock({ type: 'entity-scene-properties', id: 'scene-props' }),
      {
        summary: 'The ambush',
        participantPageIds: ['char-a', 'char-b'],
        sceneStatus: 'draft',
      },
    );
    assert.ok(index.semanticReferences.includes('char-a'));
    assert.ok(index.semanticReferences.includes('char-b'));
    assert.ok(index.semanticIndexText.includes('ambush'));
  });

  it('infobox adapter emits projected field values as text', () => {
    const index = getBlockSemanticIndex(
      baseBlock({ type: 'wiki-infobox', id: 'infobox-1' }),
      {
        orgType: 'Mercenary Company',
        region: 'Northern Marches',
      },
      { templateType: 'DEFAULT', flatPages: [] },
    );
    assert.ok(index.semanticIndexText.includes('Mercenary Company'));
    assert.ok(index.semanticIndexText.includes('Northern Marches'));
  });

  it('buildPageSemanticIndex returns one normalized entry per block in order', () => {
    const blocks: WikiPageBlock[] = [
      baseBlock({ id: 'a', type: 'text-biography', content: { markdown: 'First block.' } }),
      baseBlock({ id: 'b', type: 'entity-discovery', title: 'Discovery' }),
    ];
    const entries = buildPageSemanticIndex(blocks);
    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.blockId, 'a');
    assert.equal(entries[1]?.blockId, 'b');
    assert.equal(entries[1]?.semanticIndexText, 'Discovery');
  });

  describe('malformed payload resilience', () => {
    const resilientCases: Array<{ name: string; run: () => void }> = [
      {
        name: 'prose with undefined content',
        run: () => {
          const index = getBlockSemanticIndex(
            baseBlock({ type: 'text-tiptap', content: undefined as unknown as Record<string, unknown> }),
          );
          assert.deepEqual(index, {
            semanticIndexText: '',
            semanticKeywords: [],
            semanticReferences: [],
          });
        },
      },
      {
        name: 'character hero with malformed metadata',
        run: () => {
          assert.doesNotThrow(() => {
            characterHeroAdapter({ block: baseBlock({ type: 'entity-hero' }), pageMetadata: 'bad' });
          });
          const index = getBlockSemanticIndex(
            baseBlock({ type: 'entity-hero' }),
            null,
          );
          assert.equal(typeof index.semanticIndexText, 'string');
        },
      },
      {
        name: 'org hero with unexpected array fields',
        run: () => {
          assert.doesNotThrow(() => {
            orgHeroAdapter({
              block: baseBlock({ type: 'entity-org-hero' }),
              pageMetadata: { relations: 'not-an-array', headquartersId: 123 },
            });
          });
        },
      },
      {
        name: 'prose with legacy block payload',
        run: () => {
          assert.doesNotThrow(() => {
            proseBlockAdapter({
              block: baseBlock({
                type: 'text-biography',
                content: { markdown: 42 as unknown as string },
              }),
            });
          });
        },
      },
    ];

    for (const { name, run } of resilientCases) {
      it(name, run);
    }
  });
});
