import { composeMarkdownDocument, type FrontMatterInput } from './serializeFrontMatter.js';
import { temporalFieldsForExport } from '../temporalImportRestore.js';
import { metadataToFrontMatterFields } from '../pageMetadataRoundTrip.js';
import { rewriteMarkdownForExport } from './rewriteMarkdownForExport.js';
import type { AssetExportLookup, PageTitleLookup } from './rewriteMarkdownForExport.js';

const SECTION_SEPARATOR = '\n\n---\n\n';
const NON_TEXT_BLOCK_TYPES = new Set(['wiki-backlinks']);

export interface WikiPageExportInput {
  id: string;
  title: string;
  parentId: string | null;
  templateType: string;
  visibility: string;
  blocks: unknown;
  metadata: unknown;
  tagNames: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

function asBlockArray(blocks: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(
    (block): block is Record<string, unknown> =>
      Boolean(block) && typeof block === 'object',
  );
}

function extractTextMarkdown(blocks: Array<Record<string, unknown>>): string[] {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'text-tiptap') continue;
    const markdown =
      typeof (block.content as { markdown?: unknown } | undefined)?.markdown ===
      'string'
        ? ((block.content as { markdown: string }).markdown as string)
        : '';
    if (markdown.trim()) parts.push(markdown.trim());
  }
  return parts;
}

function serializeNonTextBlocks(blocks: Array<Record<string, unknown>>): string {
  const sections: string[] = [];
  for (const block of blocks) {
    const type = typeof block.type === 'string' ? block.type : '';
    if (type === 'text-tiptap' || NON_TEXT_BLOCK_TYPES.has(type)) continue;
    sections.push(
      `\`\`\`esiana/block\n${JSON.stringify(block, null, 2)}\n\`\`\``,
    );
  }
  return sections.join(SECTION_SEPARATOR);
}

function metadataToFrontMatter(
  page: WikiPageExportInput,
  parentEsianaId: string | null,
): FrontMatterInput {
  const customFields: Record<string, string> = {
    esiana_id: page.id,
    templateType: page.templateType,
    visibility: page.visibility,
  };

  if (parentEsianaId) {
    customFields.parent_esiana_id = parentEsianaId;
  }

  let blurb: string | undefined;
  const metadata =
    page.metadata && typeof page.metadata === 'object'
      ? { ...(page.metadata as Record<string, unknown>) }
      : null;

  if (metadata) {
    delete metadata.quickInfo;
    delete metadata.importMetadata;
    delete metadata.dmSecrets;
    delete metadata.packSlug;

    const importMeta = (page.metadata as Record<string, unknown>).importMetadata;
    if (importMeta && typeof importMeta === 'object') {
      const imported = importMeta as Record<string, unknown>;
      if (typeof imported.blurb === 'string' && imported.blurb.trim()) {
        blurb = imported.blurb.trim();
      }
      const importedTags = imported.tags;
      if (Array.isArray(importedTags)) {
        for (const tag of importedTags) {
          if (typeof tag === 'string' && tag.trim()) {
            customFields[`import_tag_${tag.trim()}`] = tag.trim();
          }
        }
      }
    }

    Object.assign(customFields, metadataToFrontMatterFields(metadata));
  }

  return {
    title: page.title,
    blurb,
    tags: page.tagNames,
    customFields: {
      ...customFields,
      ...(page.createdAt && page.updatedAt
        ? temporalFieldsForExport({
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
          })
        : {}),
    },
  };
}

export interface WikiPageMarkdownResult {
  relativePath: string;
  markdown: string;
}

export function wikiPageToMarkdown(
  page: WikiPageExportInput,
  relativePath: string,
  parentEsianaId: string | null,
  assetLookup: AssetExportLookup,
  pageLookup: PageTitleLookup,
): WikiPageMarkdownResult {
  const blocks = asBlockArray(page.blocks);
  const textParts = extractTextMarkdown(blocks).map((part) =>
    rewriteMarkdownForExport(part, assetLookup, pageLookup),
  );
  const nonTextSection = serializeNonTextBlocks(blocks);

  const bodySections = [...textParts];
  if (nonTextSection) bodySections.push(nonTextSection);

  const bodyMarkdown = bodySections.join(SECTION_SEPARATOR);
  const frontMatter = metadataToFrontMatter(page, parentEsianaId);
  const markdown = composeMarkdownDocument(frontMatter, bodyMarkdown);

  return { relativePath, markdown };
}

export function isFolderOnlyWikiPage(blocks: unknown): boolean {
  const parsed = asBlockArray(blocks);
  return parsed.every(
    (block) =>
      block.type === 'wiki-backlinks' ||
      (block.type === 'text-tiptap' &&
        !(typeof (block.content as { markdown?: unknown })?.markdown === 'string'
          ? (block.content as { markdown: string }).markdown.trim()
          : '')),
  );
}
