import { getBlockMarkdown } from './wikiLinkExtract.js';

const WIKI_PATH_REGEX =
  /\/(?:c|campaigns?)\/[A-Za-z0-9_-]+\/(?:wiki\/([A-Za-z0-9_-]+)|characters\/([A-Za-z0-9_-]+)|event-([A-Za-z0-9_-]+))/g;

const WIKILINK_SPAN_REGEX =
  /data-type="(?:wikiLink|mention)"[^>]*data-id="([^"]*)"[^>]*data-label="([^"]*)"/g;

const MARKUP_STRIP_REGEX =
  /!\[[^\]]*\]\([^)]*\)|<[^>]+>|data-type="[^"]*"[^>]*>/g;

const WIKILINK_SPAN_LABEL_REGEX =
  /data-type="(?:wikiLink|mention)"[^>]*data-id="[^"]*"[^>]*data-label="([^"]*)"/g;

export interface MentionSnippetOptions {
  maxLength?: number;
}

function pageIdFromPathMatch(match: RegExpExecArray): string {
  return match[1] ?? match[2] ?? (match[3] ? `event-${match[3]}` : '');
}

function collectMarkdownFromBlocks(
  blocks: Array<Record<string, unknown>>,
): string {
  const parts: string[] = [];
  for (const block of blocks ?? []) {
    const markdown = getBlockMarkdown(block);
    if (markdown) parts.push(markdown);
  }
  return parts.join('\n\n');
}

function findLastMentionIndex(markdown: string, targetPageId: string): number {
  let lastIndex = -1;

  WIKI_PATH_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = WIKI_PATH_REGEX.exec(markdown)) !== null) {
    if (pageIdFromPathMatch(match) === targetPageId) {
      lastIndex = match.index;
    }
  }

  WIKILINK_SPAN_REGEX.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = WIKILINK_SPAN_REGEX.exec(markdown)) !== null) {
    const id = match[1]?.trim() ?? '';
    if (id === targetPageId) {
      lastIndex = match.index;
    }
  }

  return lastIndex;
}

function stripMarkup(text: string): string {
  return text
    .replace(WIKILINK_SPAN_LABEL_REGEX, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(MARKUP_STRIP_REGEX, '')
    .replace(/\[\[([^[\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandToSentence(markdown: string, mentionIndex: number): string {
  const before = markdown.slice(0, mentionIndex);
  const after = markdown.slice(mentionIndex);

  const sentenceStart = Math.max(
    before.lastIndexOf('\n'),
    before.lastIndexOf('. '),
    before.lastIndexOf('! '),
    before.lastIndexOf('? '),
    0,
  );
  const start = sentenceStart === 0 ? 0 : sentenceStart + (markdown[sentenceStart] === '\n' ? 1 : 2);

  let end = after.search(/[.!?\n]/);
  if (end === -1) {
    end = after.length;
  } else if (markdown[mentionIndex + end] !== '\n') {
    end += 1;
  }

  const raw = markdown.slice(start, mentionIndex + end);
  return stripMarkup(raw);
}

function truncateSnippet(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Plain-text excerpt from session note blocks near the last wikilink to targetPageId. */
export function extractMentionSnippetFromBlocks(
  blocks: Array<Record<string, unknown>> | null | undefined,
  targetPageId: string,
  options?: MentionSnippetOptions,
): string | null {
  const maxLength = options?.maxLength ?? 120;
  if (!blocks?.length || !targetPageId.trim()) return null;

  const markdown = collectMarkdownFromBlocks(blocks);
  if (!markdown.trim()) return null;

  const mentionIndex = findLastMentionIndex(markdown, targetPageId);
  if (mentionIndex < 0) return null;

  const sentence = expandToSentence(markdown, mentionIndex);
  if (!sentence) return null;

  return truncateSnippet(sentence, maxLength);
}

export function resolveMemorySnippet(input: {
  sessionBlocks: Array<Record<string, unknown>> | null | undefined;
  characterPageId: string;
  knownFor: string | null | undefined;
  maxLength?: number;
}): string | null {
  const fromSession = extractMentionSnippetFromBlocks(
    input.sessionBlocks,
    input.characterPageId,
    { maxLength: input.maxLength },
  );
  if (fromSession) return fromSession;

  const knownFor = input.knownFor?.trim();
  if (knownFor) {
    return truncateSnippet(knownFor, input.maxLength ?? 120);
  }

  return null;
}
