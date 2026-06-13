import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  escapeMarkdownHeadingText,
  extractCompileMarkdown,
  joinCompileSections,
  compilePlayerSummarySections,
} from './sessionNotesCompile.js';

describe('sessionNotesCompile', () => {
  it('escapes markdown heading markers in titles', () => {
    assert.equal(escapeMarkdownHeadingText('## Sneaky Title'), 'Sneaky Title');
    assert.equal(escapeMarkdownHeadingText(''), 'Untitled');
  });

  it('prefers session-note-body block', () => {
    const markdown = extractCompileMarkdown([
      { type: 'text-tiptap', content: { markdown: 'other' } },
      { id: 'session-note-body', type: 'text-tiptap', content: { markdown: 'primary' } },
    ]);
    assert.equal(markdown, 'primary');
  });

  it('treats non-array blocks as empty', () => {
    assert.equal(extractCompileMarkdown(null), '');
    assert.equal(extractCompileMarkdown({}), '');
  });

  it('isolates sections that contain thematic break lines', () => {
    const joined = joinCompileSections(['## A\n\n---\n\nbody', '## B\n\ntext']);
    assert.ok(joined.includes('<!-- esiana-section -->'));
    assert.ok(joined.includes('## B'));
  });

  it('builds player summary with escaped headings', () => {
    const md = compilePlayerSummarySections({
      sandboxNotes: [{ title: '### Note', content: 'hello' }],
      wikiPages: [],
    });
    assert.ok(md.includes('### Note'));
    assert.ok(md.includes('hello'));
  });
});
