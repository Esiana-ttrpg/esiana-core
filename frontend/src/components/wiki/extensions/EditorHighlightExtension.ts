import { Mark, markInputRule, markPasteRule, mergeAttributes } from '@tiptap/core';
import { isEditorHighlightColorId } from '@/lib/editor/editorColorTokens';

export interface EditorHighlightOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      setHighlight: (attributes?: { color: string }) => ReturnType;
      toggleHighlight: (attributes?: { color: string }) => ReturnType;
      unsetHighlight: () => ReturnType;
    };
  }
}

const inputRegex = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))$/;
const pasteRegex = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))/g;

const HIGHLIGHT_HTML_RE =
  /^<mark[^>]*data-highlight="([^"]+)"[^>]*>([\s\S]*?)<\/mark>/;

function parseHighlightColor(element: HTMLElement): string | null {
  const token = element.getAttribute('data-highlight');
  if (token && isEditorHighlightColorId(token)) return token;
  return null;
}

export const EditorHighlightExtension = Mark.create<EditorHighlightOptions>({
  name: 'highlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => parseHighlightColor(element as HTMLElement),
        renderHTML: (attributes) => {
          if (!attributes.color || !isEditorHighlightColorId(attributes.color)) {
            return {};
          }
          return {
            'data-highlight': attributes.color,
            class: 'editor-highlight',
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'mark' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown(node, h) {
    const color = node.attrs?.color;
    const inner = h.renderChildren(node);
    if (color && isEditorHighlightColorId(color)) {
      return `<mark data-highlight="${color}">${inner}</mark>`;
    }
    return `==${inner}==`;
  },

  parseMarkdown(token, h) {
    const attrs = (token as { attrs?: { color?: string } }).attrs;
    const color = attrs?.color;
    const content = h.parseInline(
      ((token as { tokens?: Parameters<typeof h.parseInline>[0] }).tokens ?? []),
    );
    if (color && isEditorHighlightColorId(color)) {
      return h.applyMark('highlight', content, { color });
    }
    return h.applyMark('highlight', content);
  },

  markdownTokenizer: {
    name: 'highlight',
    level: 'inline',
    start: (src: string) => {
      const htmlIdx = src.indexOf('<mark');
      const mdIdx = src.indexOf('==');
      if (htmlIdx === -1) return mdIdx;
      if (mdIdx === -1) return htmlIdx;
      return Math.min(htmlIdx, mdIdx);
    },
    tokenize(src, _, h) {
      const htmlMatch = HIGHLIGHT_HTML_RE.exec(src);
      if (htmlMatch) {
        const color = htmlMatch[1]?.trim() ?? '';
        const innerContent = htmlMatch[2] ?? '';
        if (isEditorHighlightColorId(color)) {
          return {
            type: 'highlight',
            raw: htmlMatch[0],
            text: innerContent,
            tokens: h.inlineTokens(innerContent),
            attrs: { color },
          };
        }
      }

      const rule = /^(==)([^=]+)(==)/;
      const match = rule.exec(src);
      if (match) {
        const innerContent = match[2].trim();
        return {
          type: 'highlight',
          raw: match[0],
          text: innerContent,
          tokens: h.inlineTokens(innerContent),
        };
      }
    },
  },

  addCommands() {
    return {
      setHighlight:
        (attributes) =>
        ({ commands }) =>
          commands.setMark(this.name, attributes),
      toggleHighlight:
        (attributes) =>
        ({ commands }) =>
          commands.toggleMark(this.name, attributes),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-h': () => this.editor.commands.toggleHighlight(),
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: inputRegex,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: pasteRegex,
        type: this.type,
      }),
    ];
  },
});
