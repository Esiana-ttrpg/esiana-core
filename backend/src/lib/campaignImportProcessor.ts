import JSZip from 'jszip';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { CampaignWorkspace } from '../../../shared/campaignWorkspace.js';
import { normalizeWikiPageTemplateFields } from '../../../shared/wikiTemplateType.js';
import { IMPORT_SK } from '../../../shared/importSkeletonKeys.js';
import {
  collectMarkdownZipPaths,
  detectZipImportFormat,
  discoverImportFolders,
  normalizeZipPath,
} from '../../../shared/importZipStructure.js';
import type { VirtualNarrativeDeferredRef, KankaMapPlan } from '../../../shared/virtualNarrativeEntry.js';
import { KANKA_IMPORT_REPORT_TITLE } from '../../../shared/kankaImportProvenance.js';
import { compileKankaJsonZip } from './kankaJsonImportCompiler.js';
import { loadKankaImportIndex, type KankaImportIndex } from './kankaImportIndex.js';
import {
  bootstrapKankaMaps,
  ingestKankaZipAsset,
  type KankaMapBootstrapRow,
} from './kankaMapBootstrap.js';
import { reconcileCharacterIndexFromMetadata } from './characterMetadata.js';
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
import { buildSkeletonParentKeyMap } from './markdownPackImporter.js';
import { backfillCampaignPathKeys } from './wikiPathKeyService.js';
import { normalizeFrontmatter } from './importFrontmatterNormalize.js';
import {
  buildPathScanRecord,
  resolvePathHardSkip,
  resolvePlacement,
} from './importPlacementResolver.js';
import { resolveWorkspaceForPage } from '../../../shared/wikiWorkspaceResolve.js';

interface ImportManifest {
  importFormat?: 'obsidian' | 'kanka-json';
  folderMappings?: Array<{
    sourceFolderName: string;
    targetModule: string;
    isAutoMatched?: boolean;
  }>;
}

interface SkippedNote {
  sourcePath: string;
  skipReason: string;
}

interface LoadedMarkdownEntry {
  relativePath: string;
  title: string;
  bodyMarkdown: string;
  visibility: string;
  tags: string[];
  blurb?: string;
  infoboxCustomFields: Record<string, string>;
  importTemporal?: import('./temporalProvenance.js').TemporalMetadata;
  noteId?: string;
  characterMetadata?: Record<string, unknown>;
  deferredRefs?: VirtualNarrativeDeferredRef[];
  kankaEntityId?: string;
  kankaMapId?: string;
  kankaMapPlan?: KankaMapPlan;
}

interface PreparedImportRow {
  id: string;
  title: string;
  parentId: string | null;
  templateType: string;
  visibility: string;
  bodyMarkdown: string;
  metadata: Record<string, unknown>;
  module: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  return markdown.replace(/\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/gi, (_m, label) => {
    return String(label ?? '').trim();
  });
}

function buildImportReportMarkdown(
  skipped: SkippedNote[],
  warnings: string[],
): string {
  const lines: string[] = ['# Import Report', ''];
  if (skipped.length > 0) {
    lines.push('## Skipped', '');
    for (const entry of skipped) {
      lines.push(`- \`${entry.sourcePath}\` — ${entry.skipReason}`);
    }
    lines.push('');
  }
  if (warnings.length > 0) {
    lines.push('## Warnings', '');
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }
  return lines.join('\n');
}

function resolveSkeletonParentId(
  skeletonParentKey: string,
  skeletonMap: Map<string, string>,
): string | null {
  return skeletonMap.get(skeletonParentKey) ?? null;
}

const UNSAFE_METADATA_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isUnsafeMetadataKey(key: string): boolean {
  return UNSAFE_METADATA_KEYS.has(key);
}

function setNestedMetadataField(
  metadata: Record<string, unknown>,
  fieldPath: string,
  value: string,
): void {
  const parts = fieldPath.split('.');
  if (parts.some(isUnsafeMetadataKey)) return;
  if (parts.length === 1) {
    metadata[parts[0]!] = value;
    return;
  }
  let cursor: Record<string, unknown> = metadata;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]!;
    const next = cursor[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
}

function applyDeferredCharacterRefs(
  metadata: Record<string, unknown>,
  deferredRefs: VirtualNarrativeDeferredRef[] | undefined,
  externalKeyToPageId: Map<string, string>,
): Record<string, unknown> {
  if (!deferredRefs?.length) return metadata;
  const next = { ...metadata };
  for (const ref of deferredRefs) {
    const pageId = externalKeyToPageId.get(ref.kankaEntityId);
    if (!pageId) continue;
    setNestedMetadataField(next, ref.field, pageId);
  }
  return reconcileCharacterIndexFromMetadata(next);
}

function resolveImportedPortraitUrl(
  portraitUrl: string,
  createdAssetsBySource: Map<string, { id: string; url: string }>,
  imageByPath: Map<string, JSZip.JSZipObject>,
  imageByBasename: Map<string, JSZip.JSZipObject>,
): string | null {
  const normalized = portraitUrl.replace(/\\/g, '/').toLowerCase();
  const existing = createdAssetsBySource.get(normalized);
  if (existing) return `/api/assets/${existing.id}`;
  const imageFile =
    imageByPath.get(normalized) ?? imageByBasename.get(path.basename(normalized).toLowerCase());
  if (!imageFile) return null;
  const asset = createdAssetsBySource.get(imageFile.name.replace(/\\/g, '/').toLowerCase());
  return asset ? `/api/assets/${asset.id}` : null;
}

function applyResolvedPortraitMetadata(
  metadata: Record<string, unknown>,
  createdAssetsBySource: Map<string, { id: string; url: string }>,
  imageByPath: Map<string, JSZip.JSZipObject>,
  imageByBasename: Map<string, JSZip.JSZipObject>,
): Record<string, unknown> {
  const appearance = metadata.appearance;
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) return metadata;
  const portraitUrl = (appearance as Record<string, unknown>).portraitUrl;
  if (typeof portraitUrl !== 'string' || !portraitUrl.trim()) return metadata;
  const resolved = resolveImportedPortraitUrl(
    portraitUrl,
    createdAssetsBySource,
    imageByPath,
    imageByBasename,
  );
  if (!resolved) return metadata;
  return {
    ...metadata,
    appearance: { ...(appearance as Record<string, unknown>), portraitUrl: resolved },
  };
}

async function loadKankaCampaignJson(
  zip: JSZip,
): Promise<Record<string, unknown> | null> {
  const candidates = [
    'campaign.json',
    ...Object.keys(zip.files).filter((name) =>
      normalizeZipPath(name).toLowerCase().endsWith('/campaign.json'),
    ),
  ];
  for (const candidate of candidates) {
    const file = zip.file(candidate);
    if (!file) continue;
    try {
      return JSON.parse(await file.async('string')) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

function readKankaCampaignJsonId(
  campaignJson: Record<string, unknown> | null,
): string | number | null {
  if (!campaignJson) return null;
  const id = campaignJson.id;
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  if (typeof id === 'string' && id.trim()) return id.trim();
  return null;
}

function buildExistingPageIdsByKankaKey(index: KankaImportIndex): Map<string, string> {
  const map = new Map<string, string>();
  for (const [kankaId, pageId] of index.entityPageIdByKankaId) {
    map.set(kankaId, pageId);
  }
  for (const [mapId, pageId] of index.mapPageIdByKankaMapId) {
    map.set(`map:${mapId}`, pageId);
    map.set(mapId, pageId);
  }
  return map;
}

function existingWikiPageIdsFromIndex(index: KankaImportIndex): Set<string> {
  return new Set([
    ...index.entityPageIdByKankaId.values(),
    ...index.mapPageIdByKankaMapId.values(),
    ...(index.importReportPageId ? [index.importReportPageId] : []),
  ]);
}

async function applyKankaPortraitMetadata(
  metadata: Record<string, unknown>,
  options: {
    campaignId: string;
    zip: JSZip;
    campaignJsonId?: string | number | null;
    index: KankaImportIndex;
    createdAssetsBySource: Map<string, { id: string; url: string }>;
  },
): Promise<Record<string, unknown>> {
  const appearance = metadata.appearance;
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) return metadata;
  const portraitUrl = (appearance as Record<string, unknown>).portraitUrl;
  if (typeof portraitUrl !== 'string' || !portraitUrl.trim()) return metadata;
  const assetId = await ingestKankaZipAsset({
    campaignId: options.campaignId,
    zip: options.zip,
    imagePath: portraitUrl,
    campaignJsonId: options.campaignJsonId,
    assetType: 'generic',
    index: options.index,
    createdAssetsBySource: options.createdAssetsBySource,
  });
  if (!assetId) return metadata;
  return {
    ...metadata,
    appearance: {
      ...(appearance as Record<string, unknown>),
      portraitUrl: `/api/assets/${assetId}`,
    },
  };
}

function readManifestCoverAssetId(dashboardConfig: unknown): string | null {
  if (!dashboardConfig || typeof dashboardConfig !== 'object') return null;
  const root = dashboardConfig as Record<string, unknown>;
  const importManifest = root.importManifest;
  if (!importManifest || typeof importManifest !== 'object') return null;
  const assets = (importManifest as Record<string, unknown>).assets;
  if (!assets || typeof assets !== 'object') return null;
  const coverImageAssetId = (assets as Record<string, unknown>).coverImageAssetId;
  return typeof coverImageAssetId === 'string' && coverImageAssetId.trim()
    ? coverImageAssetId.trim()
    : null;
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
    const zipEntryNames = entries.map((entry) => entry.name);
    const detectedFormat = detectZipImportFormat(zipEntryNames);
    const importFormat =
      manifest?.importFormat === 'kanka-json' || detectedFormat.format === 'kanka-json'
        ? 'kanka-json'
        : 'obsidian';

    if (importFormat === 'kanka-json') {
      updateBackgroundTask(task.id, { taskName: 'Kanka JSON Ingestion' });
    }

    const folderDiscovery = discoverImportFolders(zipEntryNames);
    const wrapperPrefix = folderDiscovery.wrapperPrefix;
    const markdownEntries = entries.filter((entry) =>
      collectMarkdownZipPaths([entry.name]).length > 0,
    );
    const imageEntries = entries.filter((entry) =>
      IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    );

    const skippedNotes: SkippedNote[] = [];
    const importWarnings: string[] = [];
    const loadedByPath = new Map<string, LoadedMarkdownEntry>();
    const deferredLooseRootPaths: string[] = [];
    const externalKeyToPageId = new Map<string, string>();
    let kankaIndex: KankaImportIndex | null = null;
    let kankaMapBootstrapRows: KankaMapBootstrapRow[] = [];
    let kankaCampaignJson: Record<string, unknown> | null = null;
    let kankaCampaignJsonId: string | number | null = null;
    let existingWikiPageIds = new Set<string>();

    if (importFormat === 'kanka-json') {
      kankaIndex = await loadKankaImportIndex(campaignId);
      existingWikiPageIds = existingWikiPageIdsFromIndex(kankaIndex);
      kankaCampaignJson = await loadKankaCampaignJson(zip);
      kankaCampaignJsonId = readKankaCampaignJsonId(kankaCampaignJson);
      const compiled = await compileKankaJsonZip(zip, {
        existingPageIdsByKankaKey: buildExistingPageIdsByKankaKey(kankaIndex),
      });
      for (const [key, pageId] of compiled.externalKeyToPageId.entries()) {
        externalKeyToPageId.set(key, pageId);
      }
      for (const entry of compiled.entries) {
        const infoboxCustomFields: Record<string, string> = { type: entry.type };
        for (const [key, value] of Object.entries(entry.frontmatter)) {
          if (value == null) continue;
          if (['type', 'title', 'visibility', 'tags', 'blurb'].includes(key)) continue;
          const flattened = flattenToString(value);
          if (flattened) infoboxCustomFields[key] = flattened;
        }
        loadedByPath.set(entry.sourcePath, {
          relativePath: entry.sourcePath,
          title: entry.title,
          bodyMarkdown: entry.body,
          visibility:
            typeof entry.frontmatter.visibility === 'string'
              ? entry.frontmatter.visibility
              : 'Party',
          tags: normalizeTagValues(entry.frontmatter.tags),
          blurb:
            typeof entry.frontmatter.blurb === 'string' ? entry.frontmatter.blurb : undefined,
          infoboxCustomFields,
          noteId: entry.id,
          characterMetadata: entry.characterMetadata,
          deferredRefs: entry.deferredRefs,
          kankaEntityId: entry.externalId,
          kankaMapId: entry.kankaMapId,
          kankaMapPlan: entry.kankaMapPlan,
        });
        if (entry.kankaMapId && entry.kankaMapPlan) {
          kankaMapBootstrapRows.push({
            wikiPageId: entry.id,
            kankaMapId: entry.kankaMapId,
            plan: entry.kankaMapPlan,
          });
        }
      }
      for (const skipped of compiled.skippedModuleCounts) {
        importWarnings.push(
          `Skipped Kanka folder ${skipped.folder} (${skipped.entityCount} entities — ${skipped.reason})`,
        );
      }
    }

    if (importFormat !== 'kanka-json') {
    for (let i = 0; i < markdownEntries.length; i += 1) {
      const file = markdownEntries[i]!;
      const relativePath = file.name.replace(/\\/g, '/');
      const scan = buildPathScanRecord(relativePath, wrapperPrefix);
      const hardSkip = resolvePathHardSkip(scan, manifest?.folderMappings);
      if (hardSkip.skip) {
        skippedNotes.push({ sourcePath: relativePath, skipReason: hardSkip.reason });
        continue;
      }

      const rawContent = await file.async('string');
      const parsed = parseMarkdownFrontMatter(rawContent);
      const normalized = normalizeFrontmatter({
        title: parsed.frontMatter.title,
        blurb: parsed.frontMatter.blurb,
        tags: parsed.frontMatter.tags,
        ...parsed.frontMatter.customFields,
      });
      const title =
        normalized.title ||
        parsed.frontMatter.title ||
        extractMarkdownTitleFallback(relativePath);

      const placement = resolvePlacement({
        scan,
        normalized,
        folderMappings: manifest?.folderMappings,
        wrapperPrefix,
      });

      const tags = normalizeTagValues(parsed.frontMatter.tags);
      const infoboxCustomFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed.frontMatter.customFields ?? {})) {
        const normalizedKey = key.trim().toLowerCase();
        if (normalizedKey === 'tag' || normalizedKey === 'tags') continue;
        if (normalizedKey === 'title' || normalizedKey === 'blurb') continue;
        const flattened = flattenToString(value);
        if (flattened) infoboxCustomFields[key] = flattened;
      }

      const loaded: LoadedMarkdownEntry = {
        relativePath,
        title,
        bodyMarkdown: parsed.bodyMarkdown || '',
        visibility: normalized.visibility || 'Party',
        tags,
        blurb: normalized.blurb || parsed.frontMatter.blurb,
        infoboxCustomFields,
        importTemporal: extractTemporalFromFrontMatter(
          parsed.frontMatter.customFields ?? {},
          typeof parsed.frontMatter.customFields?.date === 'string'
            ? parsed.frontMatter.customFields.date
            : undefined,
        ),
      };

      if (placement.outcome === 'skip') {
        if (placement.skipReason === 'unclassified loose root note') {
          deferredLooseRootPaths.push(relativePath);
          loadedByPath.set(relativePath, loaded);
        } else {
          skippedNotes.push({ sourcePath: relativePath, skipReason: placement.skipReason });
        }
        continue;
      }

      if (placement.warnings?.length) {
        for (const warning of placement.warnings) {
          importWarnings.push(`${relativePath}: ${warning}`);
        }
      }

      loadedByPath.set(relativePath, {
        ...loaded,
        ...(placement.entityCategory ? {} : {}),
      });

      if (i % 5 === 0 || i === markdownEntries.length - 1) {
        updateBackgroundTask(task.id, {
          progress: Math.min(45, 20 + Math.round(((i + 1) / Math.max(markdownEntries.length, 1)) * 25)),
        });
      }
    }
    }

    const skeletonMap = await buildSkeletonParentKeyMap(campaignId);
    const noteLookupMap = new Map<string, { id: string; module: string; handle: string }>();
    const importCandidates: Array<{
      relativePath: string;
      noteId: string;
      placement: Extract<ReturnType<typeof resolvePlacement>, { outcome: 'import' }>;
    }> = [];

    function queueImport(
      relativePath: string,
      placement: Extract<ReturnType<typeof resolvePlacement>, { outcome: 'import' }>,
    ) {
      const loaded = loadedByPath.get(relativePath);
      if (!loaded) return;
      const noteId = loaded.noteId ?? randomUUID();
      noteLookupMap.set(loaded.title.toLowerCase(), {
        id: noteId,
        module: placement.module,
        handle: generateHandle(loaded.title),
      });
      importCandidates.push({ relativePath, noteId, placement });
    }

    for (const [relativePath, loaded] of loadedByPath.entries()) {
      if (deferredLooseRootPaths.includes(relativePath)) continue;
      const scan = buildPathScanRecord(relativePath, wrapperPrefix);
      const normalized = normalizeFrontmatter({
        title: loaded.title,
        blurb: loaded.blurb,
        tags: loaded.tags,
        ...loaded.infoboxCustomFields,
      });
      const placement = resolvePlacement({
        scan,
        normalized,
        folderMappings: manifest?.folderMappings,
        wrapperPrefix,
        bodyMarkdown: loaded.bodyMarkdown,
      });
      if (placement.outcome === 'import') {
        queueImport(relativePath, placement);
      }
    }

    const sessionNoteBodies = importCandidates
      .map((candidate) => loadedByPath.get(candidate.relativePath))
      .filter((loaded): loaded is LoadedMarkdownEntry => Boolean(loaded))
      .filter((loaded) => {
        const scan = buildPathScanRecord(loaded.relativePath, wrapperPrefix);
        const normalized = normalizeFrontmatter({
          title: loaded.title,
          tags: loaded.tags,
          ...loaded.infoboxCustomFields,
        });
        const placement = resolvePlacement({
          scan,
          normalized,
          folderMappings: manifest?.folderMappings,
          wrapperPrefix,
        });
        return placement.outcome === 'import' && placement.module === 'Game/Session Notes';
      })
      .map((loaded) => ({ title: loaded.title, body: loaded.bodyMarkdown }));

    for (const relativePath of deferredLooseRootPaths) {
      const loaded = loadedByPath.get(relativePath);
      if (!loaded) continue;
      const scan = buildPathScanRecord(relativePath, wrapperPrefix);
      const normalized = normalizeFrontmatter({
        title: loaded.title,
        blurb: loaded.blurb,
        tags: loaded.tags,
        ...loaded.infoboxCustomFields,
      });
      const placement = resolvePlacement({
        scan,
        normalized,
        folderMappings: manifest?.folderMappings,
        wrapperPrefix,
        bodyMarkdown: loaded.bodyMarkdown,
        sessionNoteBodies,
      });
      if (placement.outcome === 'import') {
        queueImport(relativePath, placement);
      } else {
        skippedNotes.push({
          sourcePath: relativePath,
          skipReason: placement.skipReason,
        });
      }
    }

    const imageByBasename = new Map<string, JSZip.JSZipObject>();
    const imageByPath = new Map<string, JSZip.JSZipObject>();
    for (const imageFile of imageEntries) {
      const normalizedPath = imageFile.name.replace(/\\/g, '/');
      imageByPath.set(normalizedPath.toLowerCase(), imageFile);
      imageByBasename.set(path.basename(normalizedPath).toLowerCase(), imageFile);
    }

    const createdAssetsBySource = new Map<string, { id: string; url: string }>();
    if (kankaIndex) {
      for (const [sourcePath, assetId] of kankaIndex.assetIdBySourcePath) {
        createdAssetsBySource.set(sourcePath, {
          id: assetId,
          url: `/api/assets/${assetId}`,
        });
      }
    }
    const preparedRows: PreparedImportRow[] = [];

    for (const candidate of importCandidates) {
      const loaded = loadedByPath.get(candidate.relativePath);
      if (!loaded) continue;
      let body = loaded.bodyMarkdown;

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

      body = body.replace(/\[\[([^[\]]+)\]\]/g, (_m, rawTitle: string) => {
        const noteTitle = rawTitle.trim();
        const match = noteLookupMap.get(noteTitle.toLowerCase());
        if (match) {
          return `<span data-type="mention" data-id="${match.id}" data-label="${noteTitle}" data-module="${match.module}">[[${noteTitle}]]</span>`;
        }
        return `<span data-type="mention" data-id="" data-label="${noteTitle}" data-module="${candidate.placement.module}" data-stub="true">[[${noteTitle}]]</span>`;
      });

      body = sanitizeLegacyMarkdownLinks(body);

      const parentId = resolveSkeletonParentId(
        candidate.placement.skeletonParentKey,
        skeletonMap,
      );

      preparedRows.push({
        id: candidate.noteId,
        title: loaded.title.slice(0, 120),
        parentId,
        templateType: candidate.placement.templateType,
        visibility: loaded.visibility,
        bodyMarkdown: body,
        module: candidate.placement.module,
        metadata: applyDeferredCharacterRefs(
          {
            ...(candidate.placement.entityCategory
              ? { entityCategory: candidate.placement.entityCategory }
              : {}),
            ...(loaded.characterMetadata ?? {}),
            importMetadata: {
              sourcePath: loaded.relativePath,
              module: candidate.placement.module,
              slug: generateHandle(loaded.title),
              tags: loaded.tags,
              ...(loaded.blurb ? { blurb: loaded.blurb } : {}),
              infoboxCustomFields: loaded.infoboxCustomFields,
              ...(loaded.kankaEntityId ? { kankaEntityId: loaded.kankaEntityId } : {}),
              ...(loaded.kankaMapId ? { kankaMapId: loaded.kankaMapId } : {}),
            },
          },
          loaded.deferredRefs,
          externalKeyToPageId,
        ),
        ...applySystemProvenanceTimestamps('import', loaded.importTemporal),
      });
    }

    if (importFormat !== 'kanka-json') {
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
    }

    if (importFormat === 'kanka-json' && kankaIndex) {
      for (const row of preparedRows) {
        row.metadata = await applyKankaPortraitMetadata(row.metadata, {
          campaignId,
          zip,
          campaignJsonId: kankaCampaignJsonId,
          index: kankaIndex,
          createdAssetsBySource,
        });
      }
    } else {
      for (const row of preparedRows) {
        row.metadata = applyResolvedPortraitMetadata(
          row.metadata,
          createdAssetsBySource,
          imageByPath,
          imageByBasename,
        );
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
    }

    const wikiPageBlock = (row: PreparedImportRow) =>
      ({
        id: `imported-${row.id}`,
        type: 'text-tiptap',
        x: 0,
        y: 0,
        w: 12,
        h: 10,
        isPrivate: false,
        visibility: row.visibility,
        content: { markdown: row.bodyMarkdown },
      }) as const;

    const wikiPageData = (row: PreparedImportRow) => {
      const normalized = normalizeWikiPageTemplateFields({
        templateType: row.templateType,
        metadata: row.metadata,
      });
      return {
        title: row.title,
        parentId: row.parentId,
        visibility: row.visibility,
        templateType: normalized.templateType,
        metadata: normalized.metadata as any,
        blocks: [wikiPageBlock(row)] as any,
        ...(row.createdAt ? { createdAt: row.createdAt } : {}),
        ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
      } as const;
    };

    const chunkSize = 25;
    for (let offset = 0; offset < preparedRows.length; offset += chunkSize) {
      const chunk = preparedRows.slice(offset, offset + chunkSize);
      await prisma.$transaction(
        chunk.map((row) =>
          existingWikiPageIds.has(row.id)
            ? prisma.wikiPage.update({
                where: { id: row.id },
                data: wikiPageData(row) as any,
              })
            : prisma.wikiPage.create({
                data: {
                  id: row.id,
                  campaignId,
                  ...wikiPageData(row),
                } as any,
              }),
        ),
      );
    }

    if (importFormat === 'kanka-json' && kankaIndex && kankaMapBootstrapRows.length > 0) {
      await bootstrapKankaMaps({
        campaignId,
        zip,
        campaignJsonId: kankaCampaignJsonId,
        rows: kankaMapBootstrapRows,
        externalKeyToPageId,
        index: kankaIndex,
        createdAssetsBySource,
        warnings: importWarnings,
      });
    }

    const manifestCoverAssetId = readManifestCoverAssetId(campaign.dashboardConfig);
    if (
      importFormat === 'kanka-json' &&
      kankaIndex &&
      !manifestCoverAssetId &&
      kankaCampaignJson &&
      typeof kankaCampaignJson.image === 'string' &&
      kankaCampaignJson.image.trim()
    ) {
      const bannerAssetId = await ingestKankaZipAsset({
        campaignId,
        zip,
        imagePath: kankaCampaignJson.image.trim(),
        campaignJsonId: kankaCampaignJsonId,
        assetType: 'campaign-cover',
        index: kankaIndex,
        createdAssetsBySource,
      });
      if (bannerAssetId) {
        const currentConfig =
          campaign.dashboardConfig && typeof campaign.dashboardConfig === 'object'
            ? (campaign.dashboardConfig as Record<string, unknown>)
            : {};
        const importManifest =
          currentConfig.importManifest && typeof currentConfig.importManifest === 'object'
            ? (currentConfig.importManifest as Record<string, unknown>)
            : {};
        const assets =
          importManifest.assets && typeof importManifest.assets === 'object'
            ? (importManifest.assets as Record<string, unknown>)
            : {};
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            dashboardConfig: {
              ...currentConfig,
              importManifest: {
                ...importManifest,
                assets: { ...assets, coverImageAssetId: bannerAssetId },
              },
            },
          },
        });
      }
    }

    await backfillCampaignPathKeys(campaignId);

    const importedPages = await prisma.wikiPage.findMany({
      where: {
        campaignId,
        id: { in: preparedRows.map((row) => row.id) },
      },
      select: {
        id: true,
        title: true,
        parentId: true,
        templateType: true,
        metadata: true,
        workspace: true,
      },
    });

    const pagesWorkspace = await prisma.wikiPage.findMany({
      where: { campaignId, deletedAt: null },
      select: {
        id: true,
        title: true,
        parentId: true,
        templateType: true,
        metadata: true,
      },
    });

    for (const page of importedPages) {
      const workspace =
        page.workspace ??
        resolveWorkspaceForPage(
          {
            id: page.id,
            title: page.title,
            parentId: page.parentId,
            templateType: page.templateType,
            metadata: page.metadata,
          },
          pagesWorkspace,
        );
      if (workspace === CampaignWorkspace.PAGES) {
        await prisma.wikiPage.delete({ where: { id: page.id } });
        const sourcePath =
          (page.metadata as Record<string, unknown> | null)?.importMetadata &&
          typeof (page.metadata as Record<string, any>).importMetadata?.sourcePath === 'string'
            ? String((page.metadata as Record<string, any>).importMetadata.sourcePath)
            : page.title;
        skippedNotes.push({
          sourcePath,
          skipReason: 'resolved to generic pages workspace',
        });
      }
    }

    if (skippedNotes.length > 0 || importWarnings.length > 0) {
      const reportParentId = resolveSkeletonParentId(IMPORT_SK.rules, skeletonMap);
      const reportMarkdown = buildImportReportMarkdown(skippedNotes, importWarnings);
      const reportMetadata = {
        entityCategory: 'rules-resources',
        importMetadata: { kankaImportReport: true },
      } as any;
      const reportBlocks = [
        {
          id: `import-report-${kankaIndex?.importReportPageId ?? randomUUID()}`,
          type: 'text-tiptap',
          x: 0,
          y: 0,
          w: 12,
          h: 10,
          isPrivate: false,
          visibility: 'Party',
          content: { markdown: reportMarkdown },
        },
      ] as any;

      if (kankaIndex?.importReportPageId) {
        await prisma.wikiPage.update({
          where: { id: kankaIndex.importReportPageId },
          data: {
            title: KANKA_IMPORT_REPORT_TITLE,
            parentId: reportParentId,
            metadata: reportMetadata,
            blocks: reportBlocks,
          } as any,
        });
      } else {
        await prisma.wikiPage.create({
          data: {
            id: randomUUID(),
            campaignId,
            title: KANKA_IMPORT_REPORT_TITLE,
            parentId: reportParentId,
            visibility: 'Party',
            templateType: 'DEFAULT',
            metadata: reportMetadata,
            blocks: reportBlocks,
          } as any,
        });
      }
      await backfillCampaignPathKeys(campaignId);
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
        skippedNotes: skippedNotes.length,
        importWarnings: importWarnings.length,
        processedImages: createdAssetsBySource.size,
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
