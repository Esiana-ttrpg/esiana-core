import type { WikiPageBlock } from '@/types/wiki';
import { renderAsciiBanner } from './asciiBanner';
import { pickAsciiTagline } from './asciiTaglines';
import type { PageExportContext, PageExportExtras } from './types';

const LINE_WIDTH = 78;
const RULER_MAJOR = '='.repeat(LINE_WIDTH);
const RULER_MINOR = '-'.repeat(LINE_WIDTH);

function readExtras(context: PageExportContext): PageExportExtras {
  const raw = context.extras;
  if (!raw || typeof raw !== 'object') return {};
  const breadcrumbTitles = Array.isArray(raw.breadcrumbTitles)
    ? raw.breadcrumbTitles.filter((entry): entry is string => typeof entry === 'string')
    : undefined;
  return { breadcrumbTitles };
}

function sectionBlock(heading: string, bodyLines: string[]): string {
  if (bodyLines.length === 0) return '';
  const lines = [
    RULER_MINOR,
    `  ${heading.toUpperCase()}`,
    RULER_MINOR,
    ...bodyLines.map((line) => (line.length ? `  ${line}` : '')),
    '',
  ];
  return lines.join('\n');
}

function flattenGuideBody(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
      continue;
    }

    const headingMatch = /^#{1,6}\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      output.push(headingMatch[1].replace(/\*\*|__|`/g, '').trim().toUpperCase());
      continue;
    }

    let text = line;
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/^\*\s+/, '- ');
    text = text.replace(/^-\s+\[[ xX]\]\s+/, '- ');
    output.push(text);
  }

  return output.join('\n').trim();
}

function collectTipTapMarkdown(blocks: WikiPageBlock[]): string[] {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'text-tiptap') continue;
    const markdown =
      typeof block.content?.markdown === 'string' ? block.content.markdown : '';
    const flattened = flattenGuideBody(markdown);
    if (flattened) parts.push(flattened);
  }
  return parts;
}

function collectInfoboxLines(blocks: WikiPageBlock[]): string[] {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'wiki-infobox') continue;
    const fields = block.content?.fields;
    if (!Array.isArray(fields)) continue;
    for (const entry of fields) {
      if (!entry || typeof entry !== 'object') continue;
      const key = String((entry as { key?: unknown }).key ?? '').trim();
      const value = String((entry as { value?: unknown }).value ?? '').trim();
      if (key && value) lines.push(`${key.toUpperCase()}: ${value}`);
    }
  }
  return lines;
}

function formatHeader(context: PageExportContext): string {
  const { page, campaign } = context;
  const banner = renderAsciiBanner(page.title);
  const titleBlock = banner
    ? banner.map((line) => `  ${line}`).join('\n')
    : `  ${page.title.trim().toUpperCase() || 'UNTITLED'}`;

  const metaLines = [
    `  TYPE:        ${page.templateType}`,
    `  VISIBILITY:  ${page.visibility}`,
  ];
  if (campaign.name?.trim()) {
    metaLines.push(`  CAMPAIGN:    ${campaign.name.trim()}`);
  }
  if (page.pathKey.trim()) {
    metaLines.push(`  PATH:        ${page.pathKey.trim()}`);
  }

  return [RULER_MAJOR, titleBlock, RULER_MAJOR, '', ...metaLines, ''].join('\n');
}

function formatFooter(context: PageExportContext): string {
  const seed = context.page.id.trim() || context.page.pathKey.trim() || 'untitled';
  const tagline = pickAsciiTagline(seed);
  const lines = [RULER_MAJOR, '  END OF ARCHIVE', `  ${tagline}`];
  const shareUrl = context.campaign.shareUrl?.trim();
  if (shareUrl) {
    lines.push(`  ${shareUrl}`);
  }
  lines.push('  EOF', RULER_MAJOR);
  return lines.join('\n');
}

/** GameFAQs-style plain-text guide for a wiki page (UTF-8 .txt). */
export function buildPageAsciiGuide(context: PageExportContext): string {
  const sections: string[] = [formatHeader(context)];

  if (context.page.tagNames.length > 0) {
    sections.push(
      sectionBlock(
        'TAGS',
        context.page.tagNames.map((tag) => `- ${tag}`),
      ),
    );
  }

  const { breadcrumbTitles } = readExtras(context);
  if (breadcrumbTitles && breadcrumbTitles.length > 0) {
    sections.push(
      sectionBlock('LOCATION IN WIKI', [`Breadcrumb: ${breadcrumbTitles.join(' > ')}`]),
    );
  }

  const infoboxLines = collectInfoboxLines(context.blocks);
  if (infoboxLines.length > 0) {
    sections.push(sectionBlock('DETAILS', infoboxLines));
  }

  const bodyParts = collectTipTapMarkdown(context.blocks);
  if (bodyParts.length > 0) {
    const body = bodyParts.join('\n\n----\n\n');
    sections.push(sectionBlock('BODY', body.split('\n')));
  }

  sections.push(formatFooter(context));
  return sections.filter(Boolean).join('\n').trimEnd() + '\n';
}
