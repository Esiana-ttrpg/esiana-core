import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Editor, type Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { ReactNodeView } from '@tiptap/react';
import { parseHTML } from 'linkedom';
import { DetailsContent, DetailsSummary, WikiDetailsExtension } from './WikiDetailsExtension';
import { TableOfContentsExtension, TocListView } from './TableOfContentsExtension';

const characterMarkdown = `Vaelen Frost-Spire
[[TOC]]
Origins
Born beneath the hollow roots of an ancient, dying ironwood tree, Vaelen Frost-Spire was raised by the Keepers of the Pale Flame, an order of scholars dedicated to preserving forgotten history.
His earliest memories are of candlelit archives, frost-covered windows, and the sound of pages turning long after midnight.
Full Name: Vaelen Frost-Spire
Ancestry: Half-Elf
Occupation: Scholar, Relic Hunter
Affiliation: Keepers of the Pale Flame
Current Status: Missing
Appearance
Vaelen is tall and slender, with silver-streaked black hair and pale blue eyes. His left hand bears a faintly glowing rune that becomes visible whenever ancient magic is nearby.
He is rarely seen without three possessions:
- A leather-bound journal filled with fragmented translations.
- A silver compass that points toward forgotten places.
- A broken ceremonial dagger inherited from his mentor.
The Night of Ash
Everything changed when the monastery's great archive burned.
Vaelen remembers three things clearly:
The bells rang thirteen times.
The northern tower collapsed without a sound.
Someone whispered his name from inside the flames.
He has spent the last seven years searching for an explanation.
The Sealed Testimony
<details> <summary>Confession from the Last Archivist</summary>
The archive was not destroyed by accident.
The Keepers had discovered an ancient doorway beneath the monastery. Their experiments awakened something that had been imprisoned for centuries.
The Archivist's Warning
Never open the seventh seal.
The entity behind the doorway can imitate the voices of the dead.
- The monastery's destruction was deliberate.
- Vaelen's mentor may still be alive.
- The silver compass is actually a key.
</details>
Current Objectives
- 
Recover the surviving pages of the Ashen Codex.
- 
Identify the symbol carved into the ceremonial dagger.
- 
Locate the ruins of the northern monastery.
  - 
Acquire a map of the old mountain passes.
  - 
Find a guide familiar with the frozen valley.
  - 
Investigate reports of lights beneath the ruins.
- 
Discover the fate of his mentor.
- 
Determine why the compass reacts to ancient magic.
Personal Journal
17th Day of the Frost Moon
I found another fragment today.
It contained only three words:
"The flame remembers."
I have seen those words before. They were carved into the stone beneath my childhood bed.
Perhaps the Keepers were not protecting me.
Perhaps they were protecting the world from me.
End of surviving journal entry.
`;

const structuredMarkdown = `[[TOC]]

# Vaelen Frost-Spire

## Current Objectives

- [x] Recover the surviving pages of the Ashen Codex.
- [ ] Locate the ruins of the northern monastery.
  - [ ] Find a guide familiar with the frozen valley.

<details>
<summary>Confession from the Last Archivist</summary>

### The Archivist's Warning

Never open the seventh seal.

</details>`;

test('TOC React NodeView renders the wrapper required during selection and destruction', () => {
  const html = renderToStaticMarkup(createElement(TocListView, { editor: null }));
  assert.match(html, /^<div[^>]*data-node-view-wrapper=""/);
  assert.match(html, /Table of Contents/);
  const { document } = parseHTML(`<html><body><div id="renderer">${html}</div></body></html>`);
  const renderer = { element: document.getElementById('renderer') };
  const domGetter = Object.getOwnPropertyDescriptor(ReactNodeView.prototype, 'dom')?.get;
  assert.ok(domGetter);
  assert.equal(domGetter.call({ renderer }), renderer.element);
  renderer.element!.firstElementChild!.removeAttribute('data-node-view-wrapper');
  assert.throws(() => domGetter.call({ renderer }), /Please use the NodeViewWrapper/);
});

test('exact supplied character text and structured Markdown survive parsing and serialization', () => {
  const { window } = parseHTML('<html><body></body></html>');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: window.document });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
  const extensions = [
      StarterKit,
      Markdown,
      TableOfContentsExtension,
      WikiDetailsExtension.configure({ persist: false }),
      DetailsSummary,
      DetailsContent,
      TaskList,
      TaskItem.configure({ nested: true }),
    ] as unknown as Extensions;
  const editor = new Editor({
    extensions,
    content: characterMarkdown,
    contentType: 'markdown',
    injectCSS: false,
  });
  let structuredEditor: Editor | undefined;
  try {
    const markdown = editor.getMarkdown();
    assert.match(markdown, /Vaelen Frost-Spire/);
    assert.match(markdown, /\[\[TOC\]\]/);
    assert.match(markdown, /The flame remembers/);
    assert.match(markdown, /End of surviving journal entry/);

    structuredEditor = new Editor({ extensions, content: structuredMarkdown, contentType: 'markdown', injectCSS: false });
    const json = structuredEditor.getJSON();
    assert.equal(json.content?.[0]?.type, 'toc');
    assert.ok(json.content?.some((node) => node.type === 'details'));
    const structuredOutput = structuredEditor.getMarkdown();
    assert.match(structuredOutput, /<details>/);
    assert.match(structuredOutput, /- \[x\] Recover the surviving pages/);
    assert.match(structuredOutput, /### The Archivist's Warning/);
  } finally {
    structuredEditor?.destroy();
    editor.destroy();
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
