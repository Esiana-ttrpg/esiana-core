import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTransformedPagePayload,
  getTransformOptions,
  isAllowedTransform,
} from './pageTransform.ts';

describe('getTransformOptions', () => {
  it('returns curated targets per surface', () => {
    assert.deepEqual(
      getTransformOptions('character').map((target) => target.moduleKey),
      ['bestiary'],
    );
    assert.deepEqual(
      getTransformOptions('thread').map((target) => target.moduleKey),
      ['quests'],
    );
    assert.deepEqual(
      getTransformOptions('event-lore').map((target) => target.moduleKey),
      ['quests'],
    );
  });
});

describe('buildTransformedPagePayload', () => {
  const sourceBlocks = [
    {
      id: '1',
      type: 'entity-hero',
      x: 0,
      y: 0,
      w: 3,
      h: 1,
      content: { name: 'Aldric' },
    },
    {
      id: '2',
      type: 'text-biography',
      x: 0,
      y: 1,
      w: 2,
      h: 2,
      content: { markdown: 'A wandering knight.' },
    },
  ];

  it('migrates bestiary to character with DEFAULT template type', () => {
    const result = buildTransformedPagePayload({
      sourceSurfaceKey: 'bestiary',
      targetModuleKey: 'characters',
      blocks: sourceBlocks,
      metadata: { entityCategory: 'bestiary' },
    });
    assert.equal(result.templateType, 'DEFAULT');
    assert.equal(result.metadata.entityCategory, 'characters');
  });

  it('migrates character prose into bestiary lore', () => {
    const result = buildTransformedPagePayload({
      sourceSurfaceKey: 'character',
      targetModuleKey: 'bestiary',
      blocks: sourceBlocks,
      metadata: { entityCategory: 'characters' },
    });
    assert.equal(result.templateType, 'DEFAULT');
    assert.equal(result.metadata.entityCategory, 'bestiary');
    const lore = result.blocks.find((block) => block.type === 'text-tiptap');
    assert.equal(lore?.content?.markdown, 'A wandering knight.');
    assert.ok(result.blocks.some((block) => block.type === 'entity-bestiary-hero'));
  });

  it('migrates thread to quest metadata and blocks', () => {
    const result = buildTransformedPagePayload({
      sourceSurfaceKey: 'thread',
      targetModuleKey: 'quests',
      blocks: [
        {
          id: '1',
          type: 'entity-thread-properties',
          x: 0,
          y: 0,
          w: 3,
          h: 1,
          content: {},
        },
        {
          id: '2',
          type: 'text-tiptap',
          x: 0,
          y: 1,
          w: 2,
          h: 2,
          content: { markdown: 'Find the poisoner.' },
        },
      ],
      metadata: {
        threadMetadataVersion: 'thread-metadata-v1',
        threadKind: 'mystery',
        threadStatus: 'OPEN',
      },
    });
    assert.equal(result.templateType, 'QUEST');
    assert.equal(result.metadata.questStatus, 'AVAILABLE');
    assert.ok(result.blocks.some((block) => block.type === 'entity-quest-properties'));
    assert.equal(
      result.blocks.find((block) => block.type === 'text-tiptap')?.content?.markdown,
      'Find the poisoner.',
    );
  });
});

describe('isAllowedTransform', () => {
  it('enforces curated matrix', () => {
    assert.equal(isAllowedTransform('character', 'bestiary'), true);
    assert.equal(isAllowedTransform('character', 'quests'), false);
  });
});
