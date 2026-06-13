import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { EditorTextColorExtension } from './EditorTextColorExtension.js';

function createEditor(content: string) {
  return new Editor({
    extensions: [StarterKit, Markdown, EditorTextColorExtension],
    content,
    contentType: 'markdown',
  });
}

describe('EditorTextColorExtension', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length > 0) {
      editors.pop()?.destroy();
    }
  });

  it('serializes text color to inline html markdown', () => {
    const editor = createEditor('Colored phrase');
    editors.push(editor);
    editor.commands.selectAll();
    editor.commands.setTextColor({ color: 'pink' });

    const markdown = editor.getMarkdown();
    assert.match(markdown, /<span data-text-color="pink">/);

    editor.destroy();
    editors.pop();
  });

  it('round-trips text color markdown', () => {
    const input = 'Say <span data-text-color="rose">hello</span> there';
    const editor = createEditor(input);
    editors.push(editor);

    const markdown = editor.getMarkdown();
    assert.match(markdown, /data-text-color="rose"/);

    const reloaded = createEditor(markdown);
    editors.push(reloaded);
    const json = reloaded.getJSON();
    const paragraph = json.content?.[0];
    const colored = paragraph?.content?.find(
      (node) =>
        node.marks?.some(
          (mark) => mark.type === 'textColor' && mark.attrs?.color === 'rose',
        ),
    );
    assert.ok(colored, 'expected rose text color mark after reload');

    reloaded.destroy();
    editors.pop();
    editor.destroy();
    editors.pop();
  });

  it('rejects invalid text color tokens when parsing html', () => {
    const editor = createEditor('<span data-text-color="neon">nope</span>');
    editors.push(editor);

    const json = editor.getJSON();
    const textNode = json.content?.[0]?.content?.[0];
    const colorMark = textNode?.marks?.find((mark) => mark.type === 'textColor');
    assert.equal(colorMark, undefined);

    editor.destroy();
    editors.pop();
  });
});
