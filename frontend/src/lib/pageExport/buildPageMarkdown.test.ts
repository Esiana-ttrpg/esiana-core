import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPageMarkdown } from './buildPageMarkdown.js';
import type { PageExportContext } from './types.js';

function baseContext(overrides: Partial<PageExportContext> = {}): PageExportContext {
  return {
    page: {
      id: 'page-1',
      title: 'Test Character',
      pathKey: 'test-character',
      templateType: 'CHARACTER',
      visibility: 'Party',
      tagNames: ['ally', 'wizard'],
    },
    campaign: { handle: 'demo' },
    blocks: [
      {
        id: 'b1',
        type: 'text-tiptap',
        x: 0,
        y: 0,
        w: 12,
        h: 4,
        content: { markdown: '# Lore\n\nHello **world**.' },
        isPrivate: false,
      },
    ],
    printableElement: null,
    ...overrides,
  };
}

describe('buildPageMarkdown', () => {
  it('includes YAML frontmatter and TipTap markdown body', () => {
    const markdown = buildPageMarkdown(baseContext());

    assert.match(markdown, /^---\n/);
    assert.match(markdown, /title: Test Character/);
    assert.match(markdown, /templateType: CHARACTER/);
    assert.match(markdown, /visibility: Party/);
    assert.match(markdown, /tags:/);
    assert.match(markdown, /- ally/);
    assert.match(markdown, /# Lore/);
    assert.match(markdown, /Hello \*\*world\*\*\./);
  });

  it('joins multiple text-tiptap blocks with section separators', () => {
    const markdown = buildPageMarkdown(
      baseContext({
        blocks: [
          {
            id: 'b1',
            type: 'text-tiptap',
            x: 0,
            y: 0,
            w: 12,
            h: 2,
            content: { markdown: 'First section.' },
            isPrivate: false,
          },
          {
            id: 'b2',
            type: 'text-tiptap',
            x: 0,
            y: 2,
            w: 12,
            h: 2,
            content: { markdown: 'Second section.' },
            isPrivate: false,
          },
        ],
      }),
    );

    assert.match(markdown, /First section\./);
    assert.match(markdown, /Second section\./);
    assert.match(markdown, /\n\n---\n\n/);
  });
});
