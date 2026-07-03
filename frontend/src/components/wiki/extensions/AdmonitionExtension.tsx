import {
  DEFAULT_WIKI_ADMONITION_VARIANT,
  getWikiAdmonitionVariant,
  isWikiAdmonitionVariant,
  normalizeWikiAdmonitionVariant,
  WIKI_ADMONITION_VARIANT_PATTERN,
  type WikiAdmonitionVariant,
} from '@shared/wikiAdmonition';
import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AdmonitionNodeView } from './AdmonitionNodeView';

const FENCED_ADMONITION_RE = new RegExp(
  `^:::(${WIKI_ADMONITION_VARIANT_PATTERN})\\n([\\s\\S]*?)\\n:::\\n?`,
);

const HTML_ADMONITION_RE =
  /^<aside[^>]*data-admonition="([^"]+)"[^>]*>([\s\S]*?)<\/aside>/;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    admonition: {
      insertAdmonition: (attributes?: { variant?: WikiAdmonitionVariant }) => ReturnType;
      setAdmonitionVariant: (variant: WikiAdmonitionVariant) => ReturnType;
    };
  }
}

function admonitionShellClasses(variant: WikiAdmonitionVariant): string {
  const profile = getWikiAdmonitionVariant(variant).visualProfile;
  return `wiki-admonition wiki-admonition--${variant} wiki-admonition--profile-${profile}`;
}

export const AdmonitionExtension = Node.create({
  name: 'admonition',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: DEFAULT_WIKI_ADMONITION_VARIANT,
        parseHTML: (element) =>
          normalizeWikiAdmonitionVariant(
            element.getAttribute('data-admonition') ??
              element.getAttribute('data-type'),
          ),
        renderHTML: (attributes) => ({
          'data-admonition': normalizeWikiAdmonitionVariant(attributes.variant),
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'aside[data-admonition]' },
      { tag: 'div[data-admonition]' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = normalizeWikiAdmonitionVariant(node.attrs.variant);
    return [
      'aside',
      mergeAttributes(HTMLAttributes, {
        'data-admonition': variant,
        class: admonitionShellClasses(variant),
      }),
      0,
    ];
  },

  markdownTokenizer: {
    name: 'admonition',
    level: 'block',
    start: (src) => {
      const fenced = src.indexOf(':::');
      const html = src.indexOf('<aside');
      if (fenced === -1) return html;
      if (html === -1) return fenced;
      return Math.min(fenced, html);
    },
    tokenize: (src, _tokens, lexer) => {
      const htmlMatch = HTML_ADMONITION_RE.exec(src);
      if (htmlMatch) {
        const variant = normalizeWikiAdmonitionVariant(htmlMatch[1]);
        const inner = htmlMatch[2]?.trim() ?? '';
        return {
          type: 'admonition',
          raw: htmlMatch[0],
          admonitionVariant: variant,
          text: inner,
          tokens: inner ? lexer.blockTokens(inner) : [],
        };
      }

      const match = FENCED_ADMONITION_RE.exec(src);
      if (!match) return undefined;

      const variant = normalizeWikiAdmonitionVariant(match[1]);
      const inner = match[2] ?? '';

      return {
        type: 'admonition',
        raw: match[0],
        admonitionVariant: variant,
        text: inner,
        tokens: lexer.blockTokens(inner),
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    const rawVariant =
      (token as { admonitionVariant?: string }).admonitionVariant ??
      (token as { admonitionType?: string }).admonitionType;
    const variant = normalizeWikiAdmonitionVariant(rawVariant);

    return {
      type: 'admonition',
      attrs: { variant },
      content: helpers.parseChildren(
        (token as { tokens?: Parameters<typeof helpers.parseChildren>[0] }).tokens ?? [],
      ),
    };
  },

  renderMarkdown: (node, helpers) => {
    const variant = normalizeWikiAdmonitionVariant(node.attrs?.variant);
    const content = helpers.renderChildren(node.content ?? []);
    return `:::${variant}\n${content}:::\n\n`;
  },

  addCommands() {
    return {
      insertAdmonition:
        (attributes) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                variant: normalizeWikiAdmonitionVariant(
                  attributes?.variant ?? DEFAULT_WIKI_ADMONITION_VARIANT,
                ),
              },
              content: [{ type: 'paragraph' }],
            })
            .run(),
      setAdmonitionVariant:
        (variant) =>
        ({ commands }) => {
          if (!isWikiAdmonitionVariant(variant)) return false;
          return commands.updateAttributes(this.name, { variant });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(AdmonitionNodeView, {
      contentDOMElementTag: 'div',
    });
  },
});
