import type { Editor } from '@tiptap/react';

export type WikiEditorCommandCategory =
  | 'Text'
  | 'Lists'
  | 'Insert'
  | 'Knowledge';

export type WikiEditorCommand = {
  id: string;
  label: string;
  description: string;
  aliases: string[];
  category: WikiEditorCommandCategory;
  run: (
    editor: Editor,
    range: { from: number; to: number },
    context: { openSourcePicker: () => void },
  ) => void;
};

const withTriggerRemoved = (editor: Editor, range: { from: number; to: number }) =>
  editor.chain().focus().deleteRange(range);

export const WIKI_EDITOR_COMMANDS: WikiEditorCommand[] = [
  {
    id: 'paragraph', label: 'Paragraph', description: 'Start regular body text', aliases: ['text', 'body'], category: 'Text',
    run: (editor, range) => { withTriggerRemoved(editor, range).setParagraph().run(); },
  },
  ...([1, 2, 3] as const).map((level) => ({
    id: `heading-${level}`,
    label: `Heading ${level}`,
    description: level === 1 ? 'Add a major section heading' : 'Add a nested section heading',
    aliases: [`h${level}`, 'title', 'section'],
    category: 'Text' as const,
    run: (editor: Editor, range: { from: number; to: number }) => {
      withTriggerRemoved(editor, range).setHeading({ level }).run();
    },
  })),
  {
    id: 'quote', label: 'Quote', description: 'Insert a block quotation', aliases: ['blockquote', 'citation quote'], category: 'Text',
    run: (editor, range) => { withTriggerRemoved(editor, range).toggleBlockquote().run(); },
  },
  {
    id: 'code', label: 'Code block', description: 'Insert a preformatted code block', aliases: ['code', 'preformatted'], category: 'Text',
    run: (editor, range) => { withTriggerRemoved(editor, range).toggleCodeBlock().run(); },
  },
  {
    id: 'bullet-list', label: 'Bullet list', description: 'Create an unordered list', aliases: ['bullets', 'unordered list'], category: 'Lists',
    run: (editor, range) => { withTriggerRemoved(editor, range).toggleBulletList().run(); },
  },
  {
    id: 'numbered-list', label: 'Numbered list', description: 'Create an ordered list', aliases: ['numbers', 'ordered list'], category: 'Lists',
    run: (editor, range) => { withTriggerRemoved(editor, range).toggleOrderedList().run(); },
  },
  {
    id: 'task-list', label: 'Checklist', description: 'Track preparation or planning tasks', aliases: ['tasks', 'task list', 'todo', 'checklist'], category: 'Lists',
    run: (editor, range) => { withTriggerRemoved(editor, range).toggleTaskList().run(); },
  },
  {
    id: 'details', label: 'Collapsible details', description: 'Add an editable summary with nested content', aliases: ['details', 'collapsible', 'disclosure', 'fold'], category: 'Insert',
    run: (editor, range) => { withTriggerRemoved(editor, range).setDetails().run(); },
  },
  {
    id: 'table', label: 'Table', description: 'Insert a 3 × 3 table with headers', aliases: ['grid', 'rows', 'columns'], category: 'Insert',
    run: (editor, range) => { withTriggerRemoved(editor, range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); },
  },
  {
    id: 'divider', label: 'Divider', description: 'Separate sections with a horizontal rule', aliases: ['separator', 'horizontal rule', 'hr'], category: 'Insert',
    run: (editor, range) => { withTriggerRemoved(editor, range).setHorizontalRule().run(); },
  },
  {
    id: 'admonition', label: 'Admonition', description: 'Insert a themed callout for lore or guidance', aliases: ['callout', 'aside', 'note'], category: 'Insert',
    run: (editor, range) => { withTriggerRemoved(editor, range).insertAdmonition({ variant: 'lore' }).run(); },
  },
  {
    id: 'toc', label: 'Table of contents', description: 'Insert the existing document outline', aliases: ['toc', 'contents', 'outline'], category: 'Knowledge',
    run: (editor, range) => { withTriggerRemoved(editor, range).insertContent({ type: 'toc' }).run(); },
  },
  {
    id: 'link', label: 'Link', description: 'Link selected text to a URL', aliases: ['url', 'hyperlink'], category: 'Knowledge',
    run: (editor, range) => {
      withTriggerRemoved(editor, range).run();
      const href = window.prompt('Paste a URL');
      const normalizedHref = href?.trim();
      if (!normalizedHref) return;
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent({
          type: 'text',
          text: normalizedHref,
          marks: [{ type: 'link', attrs: { href: normalizedHref } }],
        }).run();
        return;
      }
      editor.chain().focus().setLink({ href: normalizedHref }).run();
    },
  },
  {
    id: 'source', label: 'Source citation', description: 'Search campaign sources and add a citation', aliases: ['citation', 'cite', 'reference', 'source'], category: 'Knowledge',
    run: (editor, range, context) => {
      editor.chain().focus().deleteRange(range).run();
      context.openSourcePicker();
    },
  },
];

function normalizedSearchText(command: WikiEditorCommand): string {
  return [command.label, command.description, ...command.aliases].join(' ').toLocaleLowerCase();
}

export function filterWikiEditorCommands(query: string): WikiEditorCommand[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return WIKI_EDITOR_COMMANDS;
  return WIKI_EDITOR_COMMANDS.filter((command) => {
    const search = normalizedSearchText(command);
    return terms.every((term) => search.includes(term));
  }).sort((left, right) => {
    const q = terms.join(' ');
    const score = (command: WikiEditorCommand) => {
      const names = [command.label, ...command.aliases].map((value) => value.toLocaleLowerCase());
      if (names.includes(q)) return 0;
      if (names.some((name) => name.startsWith(q))) return 1;
      if (names.some((name) => name.includes(q))) return 2;
      return 3;
    };
    return score(left) - score(right);
  });
}

