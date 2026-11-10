import Details, {
  DetailsContent,
  DetailsSummary,
} from '@tiptap/extension-details';

// The repository can be installed from the workspace root or the frontend
// package. Declare the commands against the editor's local core module so the
// command surface remains typed in either layout.
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    details: {
      setDetails: () => ReturnType;
      unsetDetails: () => ReturnType;
    };
  }
}

type DetailsMarkdownToken = {
  type: 'details';
  raw: string;
  summaryTokens: unknown[];
  tokens: unknown[];
};

/**
 * Finds one complete semantic details block. A small scanner is used instead of
 * a single regular expression so nested details blocks cannot truncate their
 * parent at the first closing tag.
 */
function readDetailsBlock(src: string): {
  raw: string;
  summary: string;
  body: string;
} | null {
  if (!/^<details(?:\s[^>]*)?>/i.test(src)) return null;

  const summaryMatch = /^<details(?:\s[^>]*)?>\s*<summary>([\s\S]*?)<\/summary>/i.exec(src);
  if (!summaryMatch) return null;

  const tagPattern = /<\/?details(?:\s[^>]*)?>/gi;
  let depth = 0;
  let closingStart = -1;
  let closingEnd = -1;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(src))) {
    if (/^<\/details/i.test(match[0])) {
      depth -= 1;
      if (depth === 0) {
        closingStart = match.index;
        closingEnd = tagPattern.lastIndex;
        break;
      }
    } else {
      depth += 1;
    }
  }

  if (closingStart < 0 || closingEnd < 0) return null;

  const bodyStart = summaryMatch[0].length;
  const rawEnd = src.slice(closingEnd).match(/^\s*(?:\n|$)/)?.[0].length ?? 0;

  return {
    raw: src.slice(0, closingEnd + rawEnd),
    summary: summaryMatch[1]?.trim() ?? '',
    body: src.slice(bodyStart, closingStart).replace(/^\s*\n/, '').trimEnd(),
  };
}

/**
 * Details owns its Markdown contract. Generic raw-HTML parsing treats nested
 * Markdown as opaque text, so it is intentionally not used here.
 */
export const WikiDetailsExtension = Details.extend({
  markdownTokenizer: {
    name: 'details',
    level: 'block',
    start: (src) => src.search(/<details(?:\s|>)/i),
    tokenize: (src, _tokens, lexer) => {
      const block = readDetailsBlock(src);
      if (!block) return undefined;

      return {
        type: 'details',
        raw: block.raw,
        summaryTokens: lexer.inlineTokens(block.summary),
        tokens: block.body ? lexer.blockTokens(block.body) : [],
      } satisfies DetailsMarkdownToken;
    },
  },

  parseMarkdown: (token, helpers) => {
    const details = token as unknown as DetailsMarkdownToken;
    const body = helpers.parseChildren(details.tokens as Parameters<typeof helpers.parseChildren>[0]);

    return {
      type: 'details',
      content: [
        {
          type: 'detailsSummary',
          content: helpers.parseInline(
            details.summaryTokens as Parameters<typeof helpers.parseInline>[0],
          ),
        },
        {
          type: 'detailsContent',
          content: body.length ? body : [{ type: 'paragraph' }],
        },
      ],
    };
  },

  renderMarkdown: (node, helpers) => {
    const summary = node.content?.[0];
    const content = node.content?.[1];
    const summaryMarkdown = helpers.renderChildren(summary?.content ?? [], '').trim();
    const bodyMarkdown = helpers.renderChildren(content?.content ?? [], '\n\n').trimEnd();

    return `<details>\n<summary>${summaryMarkdown}</summary>\n\n${bodyMarkdown}\n</details>`;
  },
});

export { DetailsContent, DetailsSummary };

