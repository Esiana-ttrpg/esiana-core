import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Editor } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { encodeSourceReference } from '../../../../../shared/sourceReferences.js';
import { SourceReferenceAtom, SourceReferenceMark } from './SourceReferenceExtension.js';
import { WikiLinkExtension } from './WikiLinkExtension.js';
import {
  DetailsContent,
  DetailsSummary,
  WikiDetailsExtension,
} from './WikiDetailsExtension.js';

function createEditor(content: string, editable = true) {
  return new Editor({
    extensions: [
      StarterKit,
      Markdown,
      WikiLinkExtension,
      SourceReferenceMark,
      SourceReferenceAtom,
      WikiDetailsExtension.configure({ persist: false }),
      DetailsSummary,
      DetailsContent,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    contentType: 'markdown',
    editable,
  });
}

describe('WikiDetailsExtension Markdown contract', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length) editors.pop()?.destroy();
  });

  it('round-trips semantic details with nested canonical Markdown', () => {
    const sourcePayload = encodeSourceReference({
      payloadVersion: 1,
      identity: { providerId: 'fixture-library', sourceId: 'field-notes' },
      metadata: { title: 'Field notes' },
    });
    const input = `<details>
<summary>What the cartographer omitted</summary>

## The hidden road

The route crosses **old wards** and links to [[Moon Archive]].

- ordinary clue
- [ ] Ask Imani
  - [x] Compare the star charts

<span data-esiana-source="${sourcePayload}">Field notes</span>
</details>`;
    const editor = createEditor(input);
    editors.push(editor);

    const details = editor.getJSON().content?.[0];
    assert.equal(details?.type, 'details');
    assert.equal(details?.content?.[0]?.type, 'detailsSummary');
    assert.equal(details?.content?.[1]?.type, 'detailsContent');
    assert.ok(details?.content?.[1]?.content?.some((node) => node.type === 'heading'));
    assert.ok(details?.content?.[1]?.content?.some((node) => node.type === 'taskList'));

    const markdown = editor.getMarkdown();
    assert.match(markdown, /^<details>\n<summary>What the cartographer omitted<\/summary>/);
    assert.match(markdown, /## The hidden road/);
    assert.match(markdown, /- \[ \] Ask Imani/);
    assert.match(markdown, /- \[x\] Compare the star charts/i);
    assert.match(markdown, /\[\[Moon Archive\]\]/);
    assert.match(markdown, /data-esiana-source=/);

    const reopened = createEditor(markdown);
    editors.push(reopened);
    assert.deepEqual(reopened.getJSON(), editor.getJSON());
  });

  it('keeps ordinary lists distinct from task lists', () => {
    const editor = createEditor('- ordinary\n- [ ] task\n\n1. numbered');
    editors.push(editor);

    const types = editor.getJSON().content?.map((node) => node.type);
    assert.deepEqual(types, ['bulletList', 'taskList', 'orderedList']);
    assert.equal(editor.getJSON().content?.[0]?.content?.[0]?.attrs?.checked, undefined);
  });

  it('does not serialize local expansion state', () => {
    const editor = createEditor('<details>\n<summary>Quiet clue</summary>\n\nStill here.\n</details>');
    editors.push(editor);

    const before = editor.getMarkdown();
    const details = editor.getJSON().content?.[0];
    assert.equal(details?.attrs?.open, undefined);
    assert.equal(editor.getMarkdown(), before);
  });

  it('does not mutate tasks in read-only mode', () => {
    const editor = createEditor('- [ ] Locked task', false);
    editors.push(editor);
    const before = editor.getJSON();

    assert.equal(editor.isEditable, false);
    assert.deepEqual(editor.getJSON(), before);
  });

  it('supports the task commands bound to Enter, Tab, and Shift+Tab', () => {
    const editor = createEditor('- [ ] First task\n- [ ] Second task');
    editors.push(editor);
    let secondTextPosition = 0;
    editor.state.doc.descendants((node, position) => {
      if (node.isText && node.text === 'Second task') secondTextPosition = position;
    });
    editor.commands.setTextSelection(secondTextPosition + 1);

    assert.equal(editor.commands.sinkListItem('taskItem'), true);
    let taskItems = 0;
    editor.state.doc.descendants((node) => { if (node.type.name === 'taskItem') taskItems += 1; });
    assert.equal(taskItems, 2);
    assert.equal(editor.getJSON().content?.[0]?.content?.[0]?.content?.[1]?.type, 'taskList');

    assert.equal(editor.commands.liftListItem('taskItem'), true);
    assert.equal(editor.getJSON().content?.[0]?.content?.length, 2);

    assert.equal(editor.commands.splitListItem('taskItem'), true);
    taskItems = 0;
    editor.state.doc.descendants((node) => { if (node.type.name === 'taskItem') taskItems += 1; });
    assert.equal(taskItems, 3);
  });
});

