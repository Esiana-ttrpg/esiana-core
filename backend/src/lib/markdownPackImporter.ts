import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './prisma.js';
import { parseMarkdownFrontMatter } from './markdownFrontMatter.js';
import { buildBlocksFromMarkdown } from './campaignBackupRestore.js';
import {
  applySystemProvenanceTimestamps,
  extractTemporalFromFrontMatter,
} from './temporalImportRestore.js';
import { generateHandle } from './handleUtils.js';
import { listPackMarkdownFiles } from './packFsUtils.js';
import {
  frontMatterFieldsToMetadata,
  resolveAppearanceAssetRefs,
  resolvePageMetadataSlugRefs,
} from './pageMetadataRoundTrip.js';
import { reconcileCharacterIndexFromMetadata } from './characterMetadata.js';
import {
  normalizeWikiPageTemplateFields,
  readEntityCategoryFromMetadata,
} from '../../../shared/wikiTemplateType.js';

export interface MarkdownPackImportResult {
  importedPageCount: number;
  slugToPageId: Map<string, string>;
}

export function extractTitleFromBody(body: string): string | null {
  const lineEnd = body.indexOf('\n');
  let firstLine = lineEnd === -1 ? body : body.slice(0, lineEnd);
  if (firstLine.endsWith('\r')) firstLine = firstLine.slice(0, -1);
  if (!firstLine.startsWith('#')) return null;
  if (firstLine.length > 1 && firstLine[1] === '#') return null;

  let index = 1;
  while (index < firstLine.length && firstLine[index] === ' ') index += 1;
  const title = firstLine.slice(index).trim();
  return title.length > 0 ? title : null;
}

const SLUG_PARENT_PREFIX = 'slug:';

interface IndexedPackPage {
  id: string;
  title: string;
  parentKey: string | undefined;
  templateType: string;
  visibility: string;
  body: string;
  customFields: Record<string, string>;
  slug: string;
}

/** Ensure slug:parent pages are inserted before children (FK-safe chunked writes). */
export function sortPackPagesForInsert(pages: IndexedPackPage[]): IndexedPackPage[] {
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  const sorted: IndexedPackPage[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (page: IndexedPackPage): void => {
    if (visited.has(page.slug)) return;
    if (visiting.has(page.slug)) {
      sorted.push(page);
      visited.add(page.slug);
      return;
    }
    visiting.add(page.slug);

    const parentKey = page.parentKey?.trim();
    if (parentKey?.startsWith(SLUG_PARENT_PREFIX)) {
      const parentSlug = parentKey.slice(SLUG_PARENT_PREFIX.length).trim();
      const parentPage = bySlug.get(parentSlug);
      if (parentPage) visit(parentPage);
    }

    visiting.delete(page.slug);
    visited.add(page.slug);
    sorted.push(page);
  };

  for (const page of pages) visit(page);
  return sorted;
}

function resolveParentKey(
  raw: string | undefined,
  skeletonParentMap: Map<string, string>,
  slugToId: Map<string, string>,
): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith(SLUG_PARENT_PREFIX)) {
    const slug = trimmed.slice(SLUG_PARENT_PREFIX.length).trim();
    return slugToId.get(slug) ?? null;
  }
  if (trimmed.startsWith('skeleton:')) {
    return skeletonParentMap.get(trimmed) ?? null;
  }
  return skeletonParentMap.get(`skeleton:${trimmed.replace(/^\/+/, '')}`) ?? null;
}

export async function buildSkeletonParentKeyMap(campaignId: string): Promise<Map<string, string>> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId },
    select: { id: true, title: true, parentId: true },
  });

  const byId = new Map(pages.map((page) => [page.id, page]));
  const map = new Map<string, string>();

  for (const page of pages) {
    const parts: string[] = [];
    let current: (typeof page) | undefined = page;
    while (current) {
      parts.unshift(current.title);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    map.set(`skeleton:${parts.join('/')}`, page.id);
  }

  return map;
}

export async function importMarkdownPagesFromPack(options: {
  campaignId: string;
  packPath: string;
  skeletonParentMap: Map<string, string>;
  packAssetPathToId: Map<string, string>;
}): Promise<MarkdownPackImportResult> {
  const markdownFiles = await listPackMarkdownFiles(options.packPath);
  const slugToPageId = new Map<string, string>();
  if (markdownFiles.length === 0) {
    return { importedPageCount: 0, slugToPageId };
  }

  const indexed: IndexedPackPage[] = [];

  for (const file of markdownFiles) {
    const raw = await fs.readFile(file.absolutePath, 'utf8');
    const parsed = parseMarkdownFrontMatter(raw);
    const customFields = parsed.frontMatter.customFields;
    const title =
      parsed.frontMatter.title?.trim() ||
      customFields.title?.trim() ||
      extractTitleFromBody(parsed.bodyMarkdown) ||
      path.basename(file.relativePath, '.md');
    const slug =
      customFields.slug?.trim() ||
      generateHandle(title);
    const templateType = normalizeWikiPageTemplateFields({
      templateType:
        customFields.templateType?.trim() ||
        customFields.template?.trim() ||
        'DEFAULT',
      metadata: frontMatterFieldsToMetadata(customFields),
    }).templateType;
    const visibility = customFields.visibility?.trim() || 'Party';
    const parentKey = customFields.parentKey ?? customFields.parent;

    const id = randomUUID();
    slugToPageId.set(slug, id);

    indexed.push({
      id,
      title: title.slice(0, 120),
      parentKey,
      templateType,
      visibility,
      body: parsed.bodyMarkdown,
      customFields,
      slug,
    });
  }

  const ordered = sortPackPagesForInsert(indexed);

  const titleToPageId = new Map<string, string>();
  for (const page of ordered) {
    titleToPageId.set(page.title.toLowerCase(), page.id);
  }

  const assetMapForMarkdown = new Map<string, string>();
  for (const [relPath, assetId] of options.packAssetPathToId) {
    assetMapForMarkdown.set(relPath, assetId);
    assetMapForMarkdown.set(path.basename(relPath), assetId);
  }

  const rows = ordered.map((page) => {
    const parentId = resolveParentKey(
      page.parentKey,
      options.skeletonParentMap,
      slugToPageId,
    );

    let metadata = frontMatterFieldsToMetadata(page.customFields);
    metadata.packSlug = page.slug;
    metadata = resolvePageMetadataSlugRefs(metadata, slugToPageId);
    if (metadata.appearance) {
      metadata.appearance = resolveAppearanceAssetRefs(
        metadata.appearance,
        options.packAssetPathToId,
      );
    }

    if (readEntityCategoryFromMetadata(metadata) === 'characters') {
      metadata = reconcileCharacterIndexFromMetadata(metadata);
    }

    const normalized = normalizeWikiPageTemplateFields({
      templateType: page.templateType,
      metadata,
    });

    const blocks = buildBlocksFromMarkdown(page.body, titleToPageId, assetMapForMarkdown);
    const temporalMeta = extractTemporalFromFrontMatter(page.customFields);
    const temporalTimestamps = applySystemProvenanceTimestamps('import', temporalMeta);
    return {
      id: page.id,
      title: page.title,
      parentId,
      templateType: normalized.templateType,
      visibility: page.visibility,
      metadata: normalized.metadata,
      blocks,
      ...temporalTimestamps,
    };
  });

  const chunkSize = 25;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    await prisma.$transaction(
      chunk.map((row) =>
        prisma.wikiPage.create({
          data: {
            id: row.id,
            campaignId: options.campaignId,
            title: row.title,
            parentId: row.parentId,
            templateType: row.templateType,
            visibility: row.visibility,
            metadata: row.metadata as never,
            blocks: row.blocks as never,
            ...(row.createdAt ? { createdAt: row.createdAt } : {}),
            ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
          },
        }),
      ),
    );
  }

  return { importedPageCount: rows.length, slugToPageId };
}
