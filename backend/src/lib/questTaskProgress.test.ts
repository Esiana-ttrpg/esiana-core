import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestTaskProgress } from './questTaskProgress.js';

describe('parseQuestTaskProgress', () => {
  it('returns zero when no blocks', () => {
    assert.deepEqual(parseQuestTaskProgress(null), {
      completed: 0,
      total: 0,
      percent: 0,
    });
  });

  it('counts taskItem nodes in ProseMirror doc', () => {
    const blocks = [
      {
        type: 'text-tiptap',
        content: {
          doc: {
            type: 'doc',
            content: [
              {
                type: 'taskList',
                content: [
                  {
                    type: 'taskItem',
                    attrs: { checked: true },
                    content: [{ type: 'paragraph' }],
                  },
                  {
                    type: 'taskItem',
                    attrs: { checked: false },
                    content: [{ type: 'paragraph' }],
                  },
                ],
              },
            ],
          },
        },
      },
    ];
    const result = parseQuestTaskProgress(blocks);
    assert.equal(result.completed, 1);
    assert.equal(result.total, 2);
    assert.equal(result.percent, 50);
  });

  it('falls back to markdown checkboxes', () => {
    const blocks = [
      {
        type: 'text-tiptap',
        content: {
          markdown: '- [x] Done\n- [ ] Todo\n- [X] Also done',
        },
      },
    ];
    const result = parseQuestTaskProgress(blocks);
    assert.equal(result.completed, 2);
    assert.equal(result.total, 3);
    assert.equal(result.percent, 67);
  });

  it('excludes DM_Only blocks for players', () => {
    const blocks = [
      {
        type: 'text-tiptap',
        visibility: 'DM_Only',
        content: { markdown: '- [x] Secret' },
      },
      {
        type: 'text-tiptap',
        content: { markdown: '- [ ] Public' },
      },
    ];
    const result = parseQuestTaskProgress(blocks, { includeDmOnlyBlocks: false });
    assert.equal(result.total, 1);
    assert.equal(result.completed, 0);
  });
});
