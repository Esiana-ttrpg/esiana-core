import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import type { Extensions } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { EditorHighlightExtension } from './extensions/EditorHighlightExtension';
import { EditorTextColorExtension } from './extensions/EditorTextColorExtension';
import { TableOfContentsExtension } from './extensions/TableOfContentsExtension';
import { WikiLinkExtension } from './extensions/WikiLinkExtension';
import { SocialMentionExtension } from './extensions/SocialMentionExtension';

export const WIKI_EDITOR_PROSE_CLASS =
  'tiptap prose prose-invert prose-sm max-w-none focus:outline-none px-4 py-3 text-foreground';

export function getWikiEditorMarkdown(editor: Editor): string {
  return editor.getMarkdown?.() ?? editor.getText();
}

export function buildWikiEditorExtensions(loreExtensions: Extensions = []): Extensions {
  return [
    StarterKit,
    Markdown,
    WikiLinkExtension,
    SocialMentionExtension,
    ...loreExtensions,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Table.configure({
      resizable: false,
      HTMLAttributes: {
        class: 'wiki-tiptap-table',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    EditorTextColorExtension,
    EditorHighlightExtension,
    TableOfContentsExtension,
  ];
}

export interface WikiEditorUseEditorOptions {
  loreExtensions?: Extensions;
  content: string;
  editable?: boolean;
  proseClass?: string;
  minHeight?: string;
  onUpdate?: (markdown: string) => void;
}

export function buildWikiEditorUseEditorConfig(options: WikiEditorUseEditorOptions) {
  const proseClass = options.proseClass ?? WIKI_EDITOR_PROSE_CLASS;
  const minHeight = options.minHeight ? ` ${options.minHeight}` : '';

  return {
    extensions: buildWikiEditorExtensions(options.loreExtensions),
    content: options.content || '',
    contentType: 'markdown' as const,
    editable: options.editable ?? true,
    editorProps: {
      attributes: {
        class: `${proseClass}${minHeight}`,
      },
    },
    onUpdate: options.onUpdate
      ? ({ editor: ed }: { editor: Editor }) => {
          options.onUpdate?.(getWikiEditorMarkdown(ed));
        }
      : undefined,
  };
}
