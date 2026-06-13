import { Mark, mergeAttributes } from '@tiptap/core';
import { isEditorTextColorId } from '@/lib/editor/editorColorTokens';

export interface EditorTextColorOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (attributes: { color: string }) => ReturnType;
      toggleTextColor: (attributes: { color: string }) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

const TEXT_COLOR_HTML_RE =
  /^<span[^>]*data-text-color="([^"]+)"[^>]*>([\s\S]*?)<\/span>/;

function parseTextColor(element: HTMLElement): string | null {
  const token = element.getAttribute('data-text-color');
  if (token && isEditorTextColorId(token)) return token;
  return null;
}

export const EditorTextColorExtension = Mark.create<EditorTextColorOptions>({
  name: 'textColor',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => parseTextColor(element as HTMLElement),
        renderHTML: (attributes) => {
          if (!attributes.color || !isEditorTextColorId(attributes.color)) {
            return {};
          }
          return {
            'data-text-color': attributes.color,
            class: 'editor-text-color',
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-text-color]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown(node, h) {
    const color = node.attrs?.color;
    const inner = h.renderChildren(node);
    if (color && isEditorTextColorId(color)) {
      return `<span data-text-color="${color}">${inner}</span>`;
    }
    return inner;
  },

  parseMarkdown(token, h) {
    const attrs = (token as { attrs?: { color?: string } }).attrs;
    const color = attrs?.color;
    const content = h.parseInline(
      ((token as { tokens?: Parameters<typeof h.parseInline>[0] }).tokens ?? []),
    );
    if (color && isEditorTextColorId(color)) {
      return h.applyMark('textColor', content, { color });
    }
    return content;
  },

  markdownTokenizer: {
    name: 'textColor',
    level: 'inline',
    start: (src: string) => src.indexOf('<span'),
    tokenize(src, _, h) {
      const match = TEXT_COLOR_HTML_RE.exec(src);
      if (!match) return undefined;

      const color = match[1]?.trim() ?? '';
      const innerContent = match[2] ?? '';
      if (!isEditorTextColorId(color)) return undefined;

      return {
        type: 'textColor',
        raw: match[0],
        text: innerContent,
        tokens: h.inlineTokens(innerContent),
        attrs: { color },
      };
    },
  },

  addCommands() {
    return {
      setTextColor:
        (attributes) =>
        ({ commands }) =>
          commands.setMark(this.name, attributes),
      toggleTextColor:
        (attributes) =>
        ({ commands }) =>
          commands.toggleMark(this.name, attributes),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
