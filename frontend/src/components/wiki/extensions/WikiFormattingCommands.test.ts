import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';

function createEditor(content: string) {
  return new Editor({
    extensions: [StarterKit, Markdown],
    content,
    contentType: 'markdown',
  });
}

describe('wiki formatting commands', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length > 0) {
      editors.pop()?.destroy();
    }
  });

  it('keeps inline formatting scoped to the selected text', () => {
    const editor = createEditor('Keep this paragraph.');
    editors.push(editor);

    editor.commands.setTextSelection({ from: 1, to: 5 });
    editor.chain().focus().toggleBold().run();
    editor.commands.setTextSelection({ from: 6, to: 10 });
    editor.chain().focus().toggleItalic().run();

    const paragraph = editor.getJSON().content?.[0];
    const textNodes = paragraph?.content ?? [];
    const boldText = textNodes.find((node) => node.text === 'Keep');
    const italicText = textNodes.find((node) => node.text === 'this');
    const unformattedText = textNodes.find((node) => node.text === ' paragraph.');
    assert.equal(boldText?.marks?.[0]?.type, 'bold');
    assert.equal(italicText?.marks?.[0]?.type, 'italic');
    assert.equal(unformattedText?.marks, undefined);
  });

  it('converts only the block intersecting the heading selection', () => {
    const editor = createEditor('First paragraph.\n\nSecond paragraph.');
    editors.push(editor);

    editor.commands.setTextSelection({ from: 1, to: 17 });
    editor.chain().focus().toggleHeading({ level: 1 }).run();

    const blocks = editor.getJSON().content ?? [];
    assert.equal(blocks[0]?.type, 'heading');
    assert.equal(blocks[0]?.attrs?.level, 1);
    assert.equal(blocks[1]?.type, 'paragraph');
  });
});
