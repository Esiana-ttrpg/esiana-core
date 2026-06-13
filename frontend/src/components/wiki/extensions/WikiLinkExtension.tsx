import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { WikiLinkNodeView } from './WikiLinkNodeView';
import {
  handleWikiLinkArrowLeft,
  handleWikiLinkArrowRight,
  handleWikiLinkBackspace,
  handleWikiLinkDelete,
  handleWikiLinkEscapeSelection,
  resolveWikiLinkEnterAction,
} from './wikiLinkKeyboard';

export type WikiLinkAttributes = {
  targetPageId: string | null;
  label: string;
  resolved: boolean;
};

export const WikiLinkExtension = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      targetPageId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-id') || null,
        renderHTML: (attrs) =>
          attrs.targetPageId ? { 'data-id': attrs.targetPageId } : { 'data-id': '' },
      },
      label: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-label') ?? '',
        renderHTML: (attrs) => ({ 'data-label': attrs.label }),
      },
      resolved: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-stub') !== 'true',
        renderHTML: (attrs) =>
          attrs.resolved === false ? { 'data-stub': 'true' } : {},
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-type="wikiLink"]' },
      { tag: 'span[data-type="mention"]' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as WikiLinkAttributes;
    const resolved = Boolean(attrs.targetPageId);
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'wikiLink',
        'data-id': attrs.targetPageId ?? '',
        'data-label': attrs.label,
        ...(resolved ? {} : { 'data-stub': 'true' }),
        class: resolved ? 'wiki-link-node--resolved' : 'wiki-link-node--unresolved',
      }),
      `[[${attrs.label}]]`,
    ];
  },

  renderMarkdown(node) {
    const attrs = node.attrs as WikiLinkAttributes;
    const id = attrs.targetPageId ?? '';
    const stub = attrs.resolved === false || !id ? ' data-stub="true"' : '';
    return `<span data-type="wikiLink" data-id="${id}" data-label="${attrs.label}"${stub}>[[${attrs.label}]]</span>`;
  },

  markdownTokenizer: {
    name: 'wikiLink',
    level: 'inline',
    start: (src) => src.indexOf('[['),
    tokenize: (src) => {
      const spanMatch = src.match(
        /^<span[^>]*data-type="(?:wikiLink|mention)"[^>]*data-id="([^"]*)"[^>]*data-label="([^"]*)"[^>]*data-stub="([^"]*)"[^>]*>\[\[[^\]]+\]\]<\/span>/,
      );
      if (spanMatch) {
        const id = spanMatch[1]?.trim() ?? '';
        return {
          type: 'wikiLink',
          raw: spanMatch[0],
          attrs: {
            label: spanMatch[2]?.trim() ?? '',
            targetPageId: id || null,
            resolved: spanMatch[3] !== 'true' && Boolean(id),
          },
        };
      }
      const spanMatch2 = src.match(
        /^<span[^>]*data-type="(?:wikiLink|mention)"[^>]*data-id="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>\[\[[^\]]+\]\]<\/span>/,
      );
      if (spanMatch2) {
        const id = spanMatch2[1]?.trim() ?? '';
        return {
          type: 'wikiLink',
          raw: spanMatch2[0],
          attrs: {
            label: spanMatch2[2]?.trim() ?? '',
            targetPageId: id || null,
            resolved: Boolean(id),
          },
        };
      }
      const match = /^\[\[([^\]]+)\]\]/.exec(src);
      if (!match) return undefined;
      const label = match[1].trim();
      return {
        type: 'wikiLink',
        raw: match[0],
        attrs: { label, targetPageId: null, resolved: false },
      };
    },
  },

  parseMarkdown(token) {
    if (token.type !== 'wikiLink') {
      return { type: 'paragraph', content: [] };
    }
    return {
      type: 'wikiLink',
      attrs: (token as { attrs?: WikiLinkAttributes }).attrs ?? {},
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkNodeView);
  },

  addStorage() {
    return {
      enterAction: null as null | { type: 'navigate' | 'resolve'; pageId?: string },
    };
  },

  addKeyboardShortcuts() {
    return {
      ArrowLeft: ({ editor }) => handleWikiLinkArrowLeft(editor),
      ArrowRight: ({ editor }) => handleWikiLinkArrowRight(editor),
      Backspace: ({ editor }) => handleWikiLinkBackspace(editor),
      Delete: ({ editor }) => handleWikiLinkDelete(editor),
      Escape: ({ editor }) => {
        if (handleWikiLinkEscapeSelection(editor)) return true;
        return false;
      },
      Enter: ({ editor }) => {
        const action = resolveWikiLinkEnterAction(editor);
        if (!action) return false;
        if (editor.storage.wikiLink) {
          editor.storage.wikiLink.enterAction = action;
        }
        return true;
      },
    };
  },
});

export function buildWikiLinkHtml(attrs: WikiLinkAttributes): string {
  const id = attrs.targetPageId ?? '';
  const stub = attrs.resolved && id ? '' : ' data-stub="true"';
  return `<span data-type="wikiLink" data-id="${id}" data-label="${attrs.label}"${stub}>[[${attrs.label}]]</span>`;
}
