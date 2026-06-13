import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { EditorHighlightExtension } from './EditorHighlightExtension.js';

function createEditor(content: string) {
  return new Editor({
    extensions: [StarterKit, Markdown, EditorHighlightExtension],
    content,
    contentType: 'markdown',
  });
}

describe('EditorHighlightExtension', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length > 0) {
      editors.pop()?.destroy();
    }
  });

  it('serializes tokenized highlights to inline html markdown', () => {
    const editor = createEditor('Plain **bold** text');
    editors.push(editor);
    editor.commands.selectAll();
    editor.commands.setHighlight({ color: 'violet' });

    const markdown = editor.getMarkdown();
    assert.match(markdown, /<mark data-highlight="violet">/);
    editor.destroy();
    editors.pop();
  });

  it('round-trips tokenized highlight markdown', () => {
    const input = 'Hello <mark data-highlight="amber">world</mark>!';
    const editor = createEditor(input);
    editors.push(editor);

    const markdown = editor.getMarkdown();
    assert.match(markdown, /data-highlight="amber"/);

    const reloaded = createEditor(markdown);
    editors.push(reloaded);
    const json = reloaded.getJSON();
    const paragraph = json.content?.[0];
    assert.equal(paragraph?.type, 'paragraph');
    const marked = paragraph?.content?.find(
      (node) =>
        node.marks?.some(
          (mark) => mark.type === 'highlight' && mark.attrs?.color === 'amber',
        ),
    );
    assert.ok(marked, 'expected amber highlight mark after reload');

    reloaded.destroy();
    editors.pop();
    editor.destroy();
    editors.pop();
  });

  it('parses plain ==highlight== without a color token', () => {
    const editor = createEditor('==uncolored==');
    editors.push(editor);

    const json = editor.getJSON();
    const textNode = json.content?.[0]?.content?.[0];
    const highlightMark = textNode?.marks?.find((mark) => mark.type === 'highlight');
    assert.ok(highlightMark);
    assert.equal(highlightMark.attrs?.color ?? null, null);

    editor.destroy();
    editors.pop();
  });
});
