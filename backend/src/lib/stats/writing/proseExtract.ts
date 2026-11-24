import {
  collectMarkdownFromBlocks,
  stripMarkdownToPlain,
} from '../../wikiExcerpt.js';
import { wikiLinkSpanMatches } from '../../wikiLinkExtract.js';

const HTML_TAG_REGEX = /<\/?[a-zA-Z][^>]*>/g;
const BRACKET_WIKILINK_REGEX = /\[\[([^[\]]+)\]\]/g;

function replaceWikiLinkSpansWithLabels(markdown: string): string {
  let result = '';
  let cursor = 0;
  for (const match of wikiLinkSpanMatches(markdown)) {
    const index = match.index ?? 0;
    result += markdown.slice(cursor, index);
    const label = match[2]?.trim();
    result += label || '';
    cursor = index + match[0].length;
  }
  result += markdown.slice(cursor);
  return result;
}

/** Prose only: strip formatting, wiki-link targets, and non-prose blocks. */
export function extractProseFromBlocks(blocks: unknown): string {
  const parts = collectMarkdownFromBlocks(blocks, true);
  const cleaned = parts.map((markdown) => {
    const withLabels = replaceWikiLinkSpansWithLabels(markdown)
      .replace(BRACKET_WIKILINK_REGEX, '$1')
      .replace(HTML_TAG_REGEX, ' ');
    return stripMarkdownToPlain(withLabels);
  });
  return cleaned.filter(Boolean).join(' ');
}
