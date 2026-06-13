import JSZip from 'jszip';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { importFromPackBuffer } from './assetImport.js';
import { parseMarkdownFrontMatter } from './markdownFrontMatter.js';
import {
  createBackgroundTask,
  updateBackgroundTask,
} from './taskRegistry.js';
import { generateHandle } from './handleUtils.js';
import {
  applySystemProvenanceTimestamps,
  extractTemporalFromFrontMatter,
} from './temporalImportRestore.js';
import {
  resolveImportEntityCategory,
  resolveImportTemplateType,
} from './importModuleTemplateType.js';

type ImportModule =
  | 'Characters'
  | 'Bestiary'
  | 'Ancestries'
  | 'Organizations'
  | 'Locations'
  | 'Maps'
  | 'Objects'
  | 'Families (tree)'
  | 'Game/Rules & Resources'
  | 'Game/Quests'
  | 'Game/Session Notes'
  | 'Game/Journals'
  | 'Game/Calendars'
  | 'Game/Timelines'
  | 'Game/Events'
  | 'Wiki/Generic'
  | 'Ignore Folder';

interface ImportManifest {
  folderMappings?: Array<{
    sourceFolderName: string;
    targetModule: ImportModule | string;
    isAutoMatched?: boolean;
  }>;
}

interface NoteLookupEntry {
  id: string;
  module: string;
  handle: string;
}

interface PathLookupEntry {
  id: string;
  module: string;
}

interface ParsedImportDoc {
  relativePath: string;
  rootFolder: string;
  module: string;
  title: string;
  noteId: string;
  handle: string;
  bodyMarkdown: string;
  blurb?: string;
  tags: string[];
  infoboxCustomFields: Record<string, string>;
  importTemporal?: import('./temporalProvenance.js').TemporalMetadata;
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function normalizeTagValues(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .flatMap((entry) =>
        typeof entry === 'string' ? entry.split(',') : [String(entry ?? '')],
      )
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (input == null) return [];
  return [String(input).trim()].filter(Boolean);
}

function flattenToString(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => flattenToString(entry)).filter(Boolean).join(', ');
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value ?? '').trim();
}

function resolveModuleFromRoot(
  rootFolder: string,
  manifest: ImportManifest | null,
): string {
  if (!manifest?.folderMappings || manifest.folderMappings.length === 0) {
    return 'Wiki/Generic';
  }
  const hit = manifest.folderMappings.find(
    (entry) =>
      entry.sourceFolderName.trim().toLowerCase() === rootFolder.trim().toLowerCase(),
  );
  return hit?.targetModule?.toString().trim() || 'Wiki/Generic';
}

function extractRootFolder(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const [root] = normalized.split('/');
  return (root || '').trim();
}

function extractMarkdownTitleFallback(relativePath: string): string {
  const base = path.basename(relativePath, path.extname(relativePath)).trim();
  return base || 'Untitled Note';
}

function parseManifestFromCampaignDashboardConfig(input: unknown): ImportManifest | null {
  if (!input || typeof input !== 'object') return null;
  const root = input as Record<string, unknown>;
  const importManifest = root.importManifest;
  if (!importManifest || typeof importManifest !== 'object') return null;
  return importManifest as ImportManifest;
}

function sanitizeLegacyMarkdownLinks(markdown: string): string {
  // Replace non-image markdown path links with plain label text to avoid legacy path leakage.
  return markdown.replace(/\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/gi, (_m, label) => {
    return String(label ?? '').trim();
  });
}

export async function processCampaignImportZip(
  campaignId: string,
  opts?: { taskId?: string },
): Promise<void> {
  const task =
    opts?.taskId != null
      ? ({ id: opts.taskId } as { id: string })
      : createBackgroundTask({
          taskName: 'Obsidian ZIP Ingestion',
          targetCampaign: campaignId,
          type: 'AD_HOC',
          status: 'PENDING',
          progress: 0,
          abortable: false,
        });

  try {
    updateBackgroundTask(task.id, { status: 'PROCESSING', progress: 5 });

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        dashboardConfig: true,
      },
    });

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const manifest = parseManifestFromCampaignDashboardConfig(campaign.dashboardConfig);
    const importZipAsset = await prisma.asset.findFirst({
      where: {
        campaignId,
        type: 'campaign-import-zip',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!importZipAsset) {
      throw new Error('No campaign-import-zip asset found for this campaign');
    }

    const zipFilePath = path.join(env.uploadsDir, path.basename(importZipAsset.url));
    const zipBuffer = await fs.readFile(zipFilePath);
    const zip = await JSZip.loadAsync(zipBuffer);
    updateBackgroundTask(task.id, { progress: 15 });

    const entries = Object.values(zip.files).filter((entry) => !entry.dir);
    const markdownEntries = entries.filter((entry) =>
      entry.name.toLowerCase().endsWith('.md'),
    );
    const imageEntries = entries.filter((entry) =>
      IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    );

    const noteLookupMap = new Map<string, NoteLookupEntry>();
    const pathLookupMap = new Map<string, PathLookupEntry>();
    const parsedDocs: ParsedImportDoc[] = [];

    // Pass 1: Scaffolding and lookup maps.
    for (let i = 0; i < markdownEntries.length; i += 1) {
      const file = markdownEntries[i];
      const relativePath = file.name.replace(/\\/g, '/');
      const rootFolder = extractRootFolder(relativePath);
      const module = resolveModuleFromRoot(rootFolder, manifest);
      if (module === 'Ignore Folder') continue;

      const rawContent = await file.async('string');
      const parsed = parseMarkdownFrontMatter(rawContent);
      const title = parsed.frontMatter.title || extractMarkdownTitleFallback(relativePath);
      const noteId = randomUUID();
      const slug = generateHandle(title);

      noteLookupMap.set(title.toLowerCase(), { id: noteId, module, handle: slug });
      pathLookupMap.set(relativePath, { id: noteId, module });

      // Taxonomy and custom fields normalization from front-matter.
      const tags = normalizeTagValues(parsed.frontMatter.tags);
      const infoboxCustomFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed.frontMatter.customFields ?? {})) {
        const normalizedKey = key.trim().toLowerCase();
        if (normalizedKey === 'tag' || normalizedKey === 'tags') continue;
        if (normalizedKey === 'title' || normalizedKey === 'blurb') continue;
        const flattened = flattenToString(value);
        if (flattened) infoboxCustomFields[key] = flattened;
      }

      parsedDocs.push({
        relativePath,
        rootFolder,
        module,
        title,
        noteId,
        handle: slug,
        bodyMarkdown: parsed.bodyMarkdown || '',
        blurb: parsed.frontMatter.blurb,
        tags,
        infoboxCustomFields,
        importTemporal: extractTemporalFromFrontMatter(
          parsed.frontMatter.customFields ?? {},
          typeof parsed.frontMatter.customFields?.date === 'string'
            ? parsed.frontMatter.customFields.date
            : undefined,
        ),
      });

      if (i % 5 === 0 || i === markdownEntries.length - 1) {
        updateBackgroundTask(task.id, {
          progress: Math.min(45, 20 + Math.round(((i + 1) / Math.max(markdownEntries.length, 1)) * 25)),
        });
      }
    }

    // Resolve image entries once for embed replacement.
    const imageByBasename = new Map<string, JSZip.JSZipObject>();
    const imageByPath = new Map<string, JSZip.JSZipObject>();
    for (const imageFile of imageEntries) {
      const normalizedPath = imageFile.name.replace(/\\/g, '/');
      imageByPath.set(normalizedPath.toLowerCase(), imageFile);
      imageByBasename.set(path.basename(normalizedPath).toLowerCase(), imageFile);
    }

    const moduleFolderIds = new Map<string, string>();
    const createdAssetsBySource = new Map<string, { id: string; url: string }>();

    // Resolve or create module folders.
    const usedModules = Array.from(
      new Set(parsedDocs.map((doc) => doc.module).filter((module) => module !== 'Ignore Folder')),
    );

    for (const moduleName of usedModules) {
      const existing = await prisma.wikiPage.findFirst({
        where: { campaignId, title: moduleName },
        select: { id: true },
      });
      if (existing) {
        moduleFolderIds.set(moduleName, existing.id);
        continue;
      }
      const createdFolder = await prisma.wikiPage.create({
        data: {
          id: randomUUID(),
          campaignId,
          title: moduleName,
          parentId: null,
          visibility: 'Party',
          templateType: 'DEFAULT',
          blocks: [],
          metadata: null,
        } as any,
        select: { id: true },
      });
      moduleFolderIds.set(moduleName, createdFolder.id);
    }

    // Pass 2: Rewrite wikilinks, embed images, and sanitize links.
    const preparedRows: Array<{
      id: string;
      title: string;
      parentId: string | null;
      templateType: string;
      bodyMarkdown: string;
      metadata: Record<string, unknown>;
      createdAt?: Date;
      updatedAt?: Date;
    }> = [];

    for (let i = 0; i < parsedDocs.length; i += 1) {
      const doc = parsedDocs[i];
      let body = doc.bodyMarkdown;

      // Embedded images: ![[image.png]]
      body = body.replace(/!\[\[([^[\]]+)\]\]/g, (_m, imageRefRaw: string) => {
        const imageRef = imageRefRaw.trim();
        const imageFile =
          imageByPath.get(imageRef.toLowerCase()) ??
          imageByBasename.get(path.basename(imageRef).toLowerCase());
        if (!imageFile) return _m;
        const key = imageFile.name.replace(/\\/g, '/').toLowerCase();
        const existing = createdAssetsBySource.get(key);
        if (existing) {
          return `<img src="/api/assets/${existing.id}" alt="${path.basename(imageRef, path.extname(imageRef))}" />`;
        }
        return _m;
      });

      // Embedded images: ![](Attachments/portrait.png)
      body = body.replace(/!\[[^\]]*]\(([^)]+)\)/g, (_m, imageRefRaw: string) => {
        const imageRef = imageRefRaw.trim();
        const imageFile =
          imageByPath.get(imageRef.toLowerCase()) ??
          imageByBasename.get(path.basename(imageRef).toLowerCase());
        if (!imageFile) return _m;
        const key = imageFile.name.replace(/\\/g, '/').toLowerCase();
        const existing = createdAssetsBySource.get(key);
        if (existing) {
          return `<img src="/api/assets/${existing.id}" alt="${path.basename(imageRef, path.extname(imageRef))}" />`;
        }
        return _m;
      });

      // Wikilinks [[Note Title]]
      body = body.replace(/\[\[([^[\]]+)\]\]/g, (_m, rawTitle: string) => {
        const noteTitle = rawTitle.trim();
        const match = noteLookupMap.get(noteTitle.toLowerCase());
        if (match) {
          return `<span data-type="mention" data-id="${match.id}" data-label="${noteTitle}" data-module="${match.module}">[[${noteTitle}]]</span>`;
        }
        return `<span data-type="mention" data-id="" data-label="${noteTitle}" data-module="Wiki/Generic" data-stub="true">[[${noteTitle}]]</span>`;
      });

      body = sanitizeLegacyMarkdownLinks(body);

      const templateType = resolveImportTemplateType(doc.module, doc.infoboxCustomFields);
      const entityCategory = resolveImportEntityCategory(doc.module, doc.infoboxCustomFields);

      preparedRows.push({
        id: doc.noteId,
        title: doc.title.slice(0, 120),
        parentId: moduleFolderIds.get(doc.module) ?? null,
        templateType,
        bodyMarkdown: body,
        metadata: {
          ...(entityCategory ? { entityCategory } : {}),
          importMetadata: {
            sourcePath: doc.relativePath,
            sourceFolder: doc.rootFolder,
            module: doc.module,
            slug: doc.handle,
            tags: doc.tags,
            ...(doc.blurb ? { blurb: doc.blurb } : {}),
            infoboxCustomFields: doc.infoboxCustomFields,
          },
        },
        ...applySystemProvenanceTimestamps('import', doc.importTemporal),
      });

      if (i % 5 === 0 || i === parsedDocs.length - 1) {
        updateBackgroundTask(task.id, {
          progress: Math.min(80, 50 + Math.round(((i + 1) / Math.max(parsedDocs.length, 1)) * 30)),
        });
      }
    }

    // Materialize all image assets now so image markup can be resolved before commit.
    for (const imageFile of imageEntries) {
      const normalizedSource = imageFile.name.replace(/\\/g, '/').toLowerCase();
      if (createdAssetsBySource.has(normalizedSource)) continue;
      const buffer = await imageFile.async('nodebuffer');
      const result = await importFromPackBuffer({
        campaignId,
        buffer,
        filename: path.basename(imageFile.name),
        assetType: 'generic',
      });
      createdAssetsBySource.set(normalizedSource, {
        id: result.asset.id,
        url: result.asset.url,
      });
    }

    // second chance replacement now that assets exist
    for (const row of preparedRows) {
      row.bodyMarkdown = row.bodyMarkdown
        .replace(/!\[\[([^[\]]+)\]\]/g, (_m, imageRefRaw: string) => {
          const imageRef = imageRefRaw.trim();
          const imageFile =
            imageByPath.get(imageRef.toLowerCase()) ??
            imageByBasename.get(path.basename(imageRef).toLowerCase());
          if (!imageFile) return _m;
          const hit = createdAssetsBySource.get(
            imageFile.name.replace(/\\/g, '/').toLowerCase(),
          );
          if (!hit) return _m;
          return `<img src="/api/assets/${hit.id}" alt="${path.basename(imageRef, path.extname(imageRef))}" />`;
        })
        .replace(/!\[[^\]]*]\(([^)]+)\)/g, (_m, imageRefRaw: string) => {
          const imageRef = imageRefRaw.trim();
          const imageFile =
            imageByPath.get(imageRef.toLowerCase()) ??
            imageByBasename.get(path.basename(imageRef).toLowerCase());
          if (!imageFile) return _m;
          const hit = createdAssetsBySource.get(
            imageFile.name.replace(/\\/g, '/').toLowerCase(),
          );
          if (!hit) return _m;
          return `<img src="/api/assets/${hit.id}" alt="${path.basename(imageRef, path.extname(imageRef))}" />`;
        });
    }

    // Commit content rows in chunks to reduce lock pressure.
    const chunkSize = 25;
    for (let offset = 0; offset < preparedRows.length; offset += chunkSize) {
      const chunk = preparedRows.slice(offset, offset + chunkSize);
      await prisma.$transaction(
        chunk.map((row) =>
          prisma.wikiPage.create({
            data: {
              id: row.id,
              campaignId,
              title: row.title,
              parentId: row.parentId,
              visibility: 'Party',
              templateType: row.templateType,
              metadata: row.metadata as any,
              blocks: [
                {
                  id: `imported-${row.id}`,
                  type: 'text-tiptap',
                  x: 0,
                  y: 0,
                  w: 12,
                  h: 10,
                  isPrivate: false,
                  visibility: 'Party',
                  content: { markdown: row.bodyMarkdown },
                },
              ] as any,
              ...(row.createdAt ? { createdAt: row.createdAt } : {}),
              ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
            } as any,
          }),
        ),
      );
      const processed = Math.min(offset + chunk.length, preparedRows.length);
      updateBackgroundTask(task.id, {
        progress: Math.min(98, 82 + Math.round((processed / Math.max(preparedRows.length, 1)) * 16)),
      });
    }

    const { rebuildWikiLinksForCampaign } = await import('./wikiLinkService.js');
    const linkEdgeCount = await rebuildWikiLinksForCampaign(campaignId);
    const { rebuildEntityRelationsForCampaign } = await import('./entityRelationSyncService.js');
    await rebuildEntityRelationsForCampaign(campaignId);
    const { rebuildNarrativeLifecycleForCampaign } = await import('./narrativeLifecycleService.js');
    await rebuildNarrativeLifecycleForCampaign(campaignId);

    updateBackgroundTask(task.id, {
      status: 'COMPLETED',
      progress: 100,
      metaMerge: {
        importedNotes: preparedRows.length,
        processedImages: createdAssetsBySource.size,
        mappedPaths: pathLookupMap.size,
        wikiLinkEdges: linkEdgeCount,
      },
    });

    const { notifyImportTaskComplete } = await import('./notifications/importTaskNotifications.js');
    await notifyImportTaskComplete({
      campaignId,
      taskId: opts?.taskId,
      kind: 'import',
    });
  } catch (error) {
    updateBackgroundTask(task.id, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Campaign import failed',
    });
    const { notifyImportTaskFailed } = await import('./notifications/importTaskNotifications.js');
    await notifyImportTaskFailed({
      campaignId,
      taskId: opts?.taskId,
      kind: 'import',
      message: error instanceof Error ? error.message : 'Campaign import failed',
    });
    throw error;
  }
}

