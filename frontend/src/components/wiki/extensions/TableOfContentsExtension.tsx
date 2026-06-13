import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { useMemo } from 'react';

type TocHeading = { level: number; text: string };

function buildTocTree(headings: TocHeading[]) {
  type TocItem = TocHeading & { children?: TocItem[] };
  const root: TocItem[] = [];
  const stack: Array<{ level: number; list: TocItem[] }> = [{ level: 1, list: root }];

  for (const h of headings) {
    const level = Math.min(3, Math.max(1, h.level));
    while (stack.length > 1 && level < stack[stack.length - 1].level) {
      stack.pop();
    }

    // If we need a deeper level, attach to the previous item.
    if (level > stack[stack.length - 1].level) {
      const parentList = stack[stack.length - 1].list;
      const parent = parentList[parentList.length - 1];
      if (parent) {
        parent.children ??= [];
        stack.push({ level, list: parent.children });
      } else {
        // No parent yet; attach to root.
        stack[stack.length - 1].list.push({ ...h });
        continue;
      }
    }

    const current = stack[stack.length - 1].list;
    current.push({ ...h });
  }

  return root;
}

function TocListView({ editor }: { editor: Editor | null }) {
  const headings = useMemo(() => {
    if (!editor) return [] as TocHeading[];
    const result: TocHeading[] = [];

    editor.state.doc.descendants((node) => {
      if (node.type.name !== 'heading') return;
      const level = node.attrs?.level ?? 1;
      const text = node.textContent?.trim() ?? '';
      if (!text) return;
      if (typeof level !== 'number') return;
      result.push({
        level,
        text,
      });
    });

    return result;
  }, [editor]);

  const tocTree = useMemo(() => buildTocTree(headings), [headings]);

  function scrollToHeading(text: string) {
    if (!editor) return;
    const root = editor.view.dom;
    if (!root) return;

    // Find the first matching heading element inside this editor.
    const headingsEls = Array.from(
      root.querySelectorAll('h1,h2,h3'),
    ) as HTMLElement[];
    const match = headingsEls.find(
      (el) => (el.textContent ?? '').trim() === text.trim(),
    );
    match?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function TocUl({ items }: { items: any[] }) {
    return (
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={`${item.level}-${item.text}`}>
            <button
              type="button"
              onClick={() => scrollToHeading(item.text)}
              className="w-full text-left text-xs text-foreground hover:text-primary"
            >
              {item.text}
            </button>
            {item.children?.length ? (
              <div className="mt-1 border-l border-border pl-3">
                <TocUl items={item.children} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Table of Contents
      </div>
      {headings.length ? <TocUl items={tocTree} /> : null}
    </div>
  );
}

export const TableOfContentsExtension = Node.create({
  name: 'toc',
  group: 'block',
  atom: true,
  selectable: false,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-toc]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-toc': '' }),
    ];
  },

  markdownTokenizer: {
    name: 'toc',
    level: 'block',
    start: (src) => src.indexOf('[[TOC]]'),
    tokenize: (src) => {
      const match = /^\[\[TOC\]\]/.exec(src);
      if (!match) return undefined;
      return { type: 'toc', raw: match[0] };
    },
  },

  parseMarkdown: () => {
    return { type: 'toc' };
  },

  renderMarkdown: () => {
    return '[[TOC]]\n\n';
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ editor }) => <TocListView editor={editor} />);
  },
});

