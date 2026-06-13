import { prisma } from './prisma.js';
import { PLAYER_SESSION_NOTES_TITLE } from './seedWiki.js';
import { wikiPageVisibilityFilter } from './wikiTags.js';

const COMPILE_MAX_PAGES = Number(process.env.COMPILE_MAX_PAGES ?? 500);
const COMPILE_MAX_BYTES = Number(process.env.COMPILE_MAX_BYTES ?? 2_000_000);
const COMPILE_MAX_BLOCK_CHARS = 512 * 1024;
const SECTION_SEPARATOR = '\n\n---\n\n';

export interface CompileSessionNotesQuery {
  sessionPageId?: string;
  notebookArcId?: string;
  timelineFrom?: number;
  timelineTo?: number;
  orderBy?: 'timeline' | 'updated';
}

export interface CompileSessionNotesResult {
  title: string;
  compiledMarkdown: string;
  pageCount: number;
  sourcePageIds: string[];
  warnings: string[];
  truncated: boolean;
  skippedPageIds: string[];
}

export class SessionCompileError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SessionCompileError';
  }
}

export function escapeMarkdownHeadingText(title: string): string {
  const collapsed = title.replace(/\r?\n/g, ' ').trim();
  if (!collapsed) return 'Untitled';
  return collapsed.replace(/^#+\s*/, '').trim() || 'Untitled';
}

export function extractCompileMarkdown(blocks: unknown): string {
  try {
    const rawBlocks: unknown[] = Array.isArray(blocks) ? blocks : [];
    const textBlock =
      rawBlocks.find(
        (block) =>
          block &&
          typeof block === 'object' &&
          (block as { id?: string }).id === 'session-note-body',
      ) ??
      rawBlocks.find(
        (block) =>
          block &&
          typeof block === 'object' &&
          (block as { type?: string }).type === 'text-tiptap',
      );

    if (!textBlock || typeof textBlock !== 'object') return '';

    const content = (textBlock as { content?: { markdown?: unknown } }).content;
    const markdown =
      typeof content?.markdown === 'string' ? content.markdown : '';
    const trimmed = markdown.trim();
    if (trimmed.length > COMPILE_MAX_BLOCK_CHARS) {
      return trimmed.slice(0, COMPILE_MAX_BLOCK_CHARS);
    }
    return trimmed;
  } catch {
    return '';
  }
}

export function joinCompileSections(sections: string[]): string {
  return sections
    .map((section) => {
      if (!section.includes(SECTION_SEPARATOR)) return section;
      return `<!-- esiana-section -->\n${section}`;
    })
    .join(SECTION_SEPARATOR);
}

interface CompilePageRow {
  id: string;
  title: string;
  blocks: unknown;
  updatedAt: Date;
  sequenceOrder?: number;
}

function comparePages(
  a: CompilePageRow,
  b: CompilePageRow,
  orderBy: 'timeline' | 'updated',
): number {
  if (orderBy === 'timeline') {
    const aSeq = a.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
    const bSeq = b.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
    if (aSeq !== bSeq) return aSeq - bSeq;
    return a.updatedAt.getTime() - b.updatedAt.getTime();
  }
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

function buildMarkdownSections(
  pages: CompilePageRow[],
  warnings: string[],
  skippedPageIds: string[],
): { sections: string[]; sourcePageIds: string[] } {
  const sections: string[] = [];
  const sourcePageIds: string[] = [];

  for (const page of pages) {
    sourcePageIds.push(page.id);
    const text = extractCompileMarkdown(page.blocks);
    if (!text) {
      skippedPageIds.push(page.id);
      continue;
    }
    const heading = escapeMarkdownHeadingText(page.title);
    sections.push(`## ${heading}\n\n${text}`);
  }

  if (sections.length === 0 && pages.length > 0) {
    warnings.push('No non-empty note bodies in scope');
  }

  return { sections, sourcePageIds };
}

export async function compileSessionNotesForCampaign(
  campaignId: string,
  hasElevatedView: boolean,
  query: CompileSessionNotesQuery,
): Promise<CompileSessionNotesResult> {
  const warnings: string[] = [];
  const skippedPageIds: string[] = [];

  const visibilityWhere = wikiPageVisibilityFilter(hasElevatedView);
  const orderBy = query.orderBy === 'updated' ? 'updated' : 'timeline';

  if (query.notebookArcId) {
    const pages = await prisma.wikiPage.findMany({
      where: {
        campaignId,
        notebookArcId: query.notebookArcId,
        ...(visibilityWhere ?? {}),
      },
      select: {
        id: true,
        title: true,
        blocks: true,
        updatedAt: true,
      },
    });

    if (pages.length > COMPILE_MAX_PAGES) {
      throw new SessionCompileError(
        `Too many pages to compile (${pages.length})`,
        413,
        'COMPILE_TOO_LARGE',
        { pageCount: pages.length },
      );
    }

    const sorted = [...pages].sort((a, b) =>
      orderBy === 'updated'
        ? b.updatedAt.getTime() - a.updatedAt.getTime()
        : a.title.localeCompare(b.title, undefined, { numeric: true }),
    );

    const { sections, sourcePageIds } = buildMarkdownSections(
      sorted,
      warnings,
      skippedPageIds,
    );

    return finalizeCompileResult(
      'Notebook session notes',
      sections,
      sourcePageIds,
      warnings,
      skippedPageIds,
    );
  }

  const sessionRoot = await prisma.wikiPage.findFirst({
    where: { campaignId, title: PLAYER_SESSION_NOTES_TITLE },
    select: { id: true },
  });

  if (!sessionRoot) {
    throw new SessionCompileError(
      'Player Session Notes folder not found',
      404,
      'SESSION_ROOT_MISSING',
    );
  }

  let parentIds: string[] = [];
  let title = 'All session notes';

  if (query.sessionPageId) {
    const sessionPage = await prisma.wikiPage.findFirst({
      where: { id: query.sessionPageId, campaignId },
      select: { id: true, title: true },
    });
    if (!sessionPage) {
      throw new SessionCompileError('Session page not found', 404, 'SESSION_PAGE_MISSING');
    }
    parentIds = [sessionPage.id];
    title = 'Session notes compilation';
  } else {
    parentIds = [sessionRoot.id];
    const sessionFolders = await prisma.wikiPage.findMany({
      where: { parentId: sessionRoot.id, campaignId },
      select: { id: true },
    });
    parentIds.push(...sessionFolders.map((p) => p.id));
  }

  const timelineRows =
    query.timelineFrom !== undefined || query.timelineTo !== undefined
      ? await (prisma as any).campaignSessionTimeline.findMany({
          where: {
            campaignId,
            ...(query.timelineFrom !== undefined
              ? { sequenceOrder: { gte: query.timelineFrom } }
              : {}),
            ...(query.timelineTo !== undefined
              ? { sequenceOrder: { lte: query.timelineTo } }
              : {}),
          },
          select: { wikiPageId: true, sequenceOrder: true },
          orderBy: { sequenceOrder: 'asc' },
        })
      : null;

  let pages: CompilePageRow[];

  if (timelineRows && timelineRows.length > 0) {
    const wikiPageIds = timelineRows.map(
      (row: { wikiPageId: string }) => row.wikiPageId,
    );
    const orderByMap = new Map<string, number>(
      timelineRows.map((row: { wikiPageId: string; sequenceOrder: number }) => [
        row.wikiPageId,
        row.sequenceOrder,
      ]),
    );

    const wikiPages = await prisma.wikiPage.findMany({
      where: {
        campaignId,
        id: { in: wikiPageIds },
        ...(visibilityWhere ?? {}),
      },
      select: {
        id: true,
        title: true,
        blocks: true,
        updatedAt: true,
      },
    });

    const pageById = new Map(wikiPages.map((p) => [p.id, p]));

    for (const row of timelineRows) {
      if (!pageById.has(row.wikiPageId)) {
        warnings.push(`Timeline point references missing page ${row.wikiPageId}`);
      }
    }

    pages = timelineRows
      .map((row: { wikiPageId: string; sequenceOrder: number }) => {
        const page = pageById.get(row.wikiPageId);
        if (!page) return null;
        return {
          ...page,
          sequenceOrder: orderByMap.get(page.id),
        } satisfies CompilePageRow;
      })
      .filter((page: CompilePageRow | null): page is CompilePageRow => page !== null);
  } else {
    pages = await prisma.wikiPage.findMany({
      where: {
        campaignId,
        parentId: { in: parentIds },
        ...(visibilityWhere ?? {}),
      },
      select: {
        id: true,
        title: true,
        blocks: true,
        updatedAt: true,
      },
    });

    if (orderBy === 'timeline') {
      const timelineForParents = await (prisma as any).campaignSessionTimeline.findMany({
        where: { campaignId, wikiPage: { parentId: { in: parentIds } } },
        select: { wikiPageId: true, sequenceOrder: true },
      });
      const orderMap = new Map<string, number>(
        timelineForParents.map(
          (row: { wikiPageId: string; sequenceOrder: number }) => [
            row.wikiPageId,
            row.sequenceOrder,
          ],
        ),
      );
      pages = pages.map((page) => ({
        ...page,
        sequenceOrder: orderMap.get(page.id),
      }));
    }
  }

  if (pages.length > COMPILE_MAX_PAGES) {
    throw new SessionCompileError(
      `Too many pages to compile (${pages.length})`,
      413,
      'COMPILE_TOO_LARGE',
      { pageCount: pages.length },
    );
  }

  if (pages.length === 0) {
    warnings.push('No pages in scope');
    return finalizeCompileResult(title, [], [], warnings, skippedPageIds);
  }

  pages.sort((a, b) => comparePages(a, b, orderBy));

  const { sections, sourcePageIds } = buildMarkdownSections(
    pages,
    warnings,
    skippedPageIds,
  );

  return finalizeCompileResult(
    title,
    sections,
    sourcePageIds,
    warnings,
    skippedPageIds,
  );
}

function finalizeCompileResult(
  title: string,
  sections: string[],
  sourcePageIds: string[],
  warnings: string[],
  skippedPageIds: string[],
): CompileSessionNotesResult {
  let compiledMarkdown = joinCompileSections(sections);
  let truncated = false;

  if (compiledMarkdown.length > COMPILE_MAX_BYTES) {
    compiledMarkdown = compiledMarkdown.slice(0, COMPILE_MAX_BYTES);
    truncated = true;
    warnings.push(`Output truncated at ${COMPILE_MAX_BYTES} bytes`);
  }

  return {
    title,
    compiledMarkdown,
    pageCount: sections.length,
    sourcePageIds,
    warnings,
    truncated,
    skippedPageIds,
  };
}

export function compilePlayerSummarySections(input: {
  sandboxNotes: Array<{ title: string; content: string | null }>;
  wikiPages: Array<{ title: string; blocks: unknown }>;
}): string {
  const blocks: string[] = [];

  for (const note of input.sandboxNotes) {
    const heading = escapeMarkdownHeadingText(note.title);
    if (note.content?.trim()) {
      blocks.push(`### ${heading}\n\n${note.content.trim()}`);
    } else {
      blocks.push(`### ${heading}\n\n_(empty note)_`);
    }
  }

  for (const page of input.wikiPages) {
    const body = extractCompileMarkdown(page.blocks);
    if (body) {
      const heading = escapeMarkdownHeadingText(page.title);
      blocks.push(`### ${heading}\n\n${body}`);
    }
  }

  return joinCompileSections(blocks) || '_No session notes recorded yet._';
}
