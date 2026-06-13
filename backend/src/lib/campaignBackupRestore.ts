import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { importFromPackBuffer } from './assetImport.js';
import { deleteAssetRecordFiles } from './assetFiles.js';
import { parseMarkdownFrontMatter } from './markdownFrontMatter.js';
import {
  createBackgroundTask,
  updateBackgroundTask,
} from './taskRegistry.js';
import {
  notifyImportTaskComplete,
  notifyImportTaskFailed,
} from './notifications/importTaskNotifications.js';
import {
  CAMPAIGN_BACKUP_FORMAT,
  type CampaignBackupManifest,
  type SovereignMediaManifest,
  type SovereignRelations,
} from './campaignExport/types.js';
import { rebuildWikiLinksForCampaign } from './wikiLinkService.js';
import {
  applySystemProvenanceTimestamps,
  extractTemporalFromFrontMatter,
} from './temporalImportRestore.js';
import { normalizeGameSystemSlug } from './gameSystems.js';
import {
  CampaignDiscoverability,
  isValidDiscoverability,
  normalizeDiscoverability,
} from '../../../shared/campaignPolicy/discoverability.js';
import { frontMatterFieldsToMetadata } from './pageMetadataRoundTrip.js';
import {
  parseOperationalPayload,
  restoreOperationalPayload,
  SOVEREIGN_OPERATIONAL_PATH,
} from './campaignExport/sovereignOperational.js';
import {
  restoreKnowledgePayload,
  SOVEREIGN_KNOWLEDGE_PATH,
  resolveWikiPageSlug,
} from './campaignExport/sovereignKnowledge.js';
import { bootstrapPackSatelliteRows } from './packSatelliteBootstrap.js';

const SECTION_SEPARATOR = '\n\n---\n\n';
const ESiana_BLOCK_REGEX = /```esiana\/block\n([\s\S]*?)\n```/g;

function parseManifest(raw: unknown): CampaignBackupManifest {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup manifest');
  }
  const manifest = raw as CampaignBackupManifest;
  if (manifest.format !== CAMPAIGN_BACKUP_FORMAT) {
    throw new Error(
      `Unsupported backup format: ${String((manifest as { format?: unknown }).format)}`,
    );
  }
  return manifest;
}

function parseRelations(raw: unknown): SovereignRelations {
  if (!raw || typeof raw !== 'object') {
    return { links: [], tags: [], tree: [], mapPins: [] };
  }
  const relations = raw as SovereignRelations;
  return {
    links: Array.isArray(relations.links) ? relations.links : [],
    tags: Array.isArray(relations.tags) ? relations.tags : [],
    tree: Array.isArray(relations.tree) ? relations.tree : [],
    mapPins: Array.isArray(relations.mapPins) ? relations.mapPins : [],
  };
}

function parseMediaManifest(raw: unknown): SovereignMediaManifest {
  if (!raw || typeof raw !== 'object') {
    return { assets: [] };
  }
  const manifest = raw as SovereignMediaManifest;
  return {
    assets: Array.isArray(manifest.assets) ? manifest.assets : [],
  };
}

function splitBodySections(bodyMarkdown: string): string[] {
  return bodyMarkdown
    .split(SECTION_SEPARATOR)
    .map((section) => section.trim())
    .filter(Boolean);
}

function extractEsianaBlocks(section: string): {
  markdownParts: string[];
  blocks: Array<Record<string, unknown>>;
} {
  const markdownParts: string[] = [];
  const blocks: Array<Record<string, unknown>> = [];
  let lastIndex = 0;

  for (const match of section.matchAll(ESiana_BLOCK_REGEX)) {
    const index = match.index ?? 0;
    const before = section.slice(lastIndex, index).trim();
    if (before) markdownParts.push(before);

    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') blocks.push(parsed);
    } catch {
      markdownParts.push(match[0]);
    }

    lastIndex = index + match[0].length;
  }

  const tail = section.slice(lastIndex).trim();
  if (tail) markdownParts.push(tail);

  return { markdownParts, blocks };
}

function rewriteMediaPathsForImport(
  markdown: string,
  mediaFileToAssetId: Map<string, string>,
): string {
  return markdown.replace(
    /!\[([^\]]*)\]\(media\/([^)]+)\)/gi,
    (_match, alt: string, mediaFile: string) => {
      const assetId = mediaFileToAssetId.get(mediaFile.trim());
      if (!assetId) return _match;
      const altText = alt?.trim() ?? '';
      return `<img src="/api/assets/${assetId}" alt="${altText}" />`;
    },
  );
}

function rewriteWikilinksForImport(
  markdown: string,
  titleToPageId: Map<string, string>,
): string {
  return markdown.replace(/\[\[([^[\]]+)\]\]/g, (_match, rawTitle: string) => {
    const title = rawTitle.trim();
    const pageId = titleToPageId.get(title.toLowerCase());
    if (pageId) {
      return `<span data-type="mention" data-id="${pageId}" data-label="${title}">[[${title}]]</span>`;
    }
    return `<span data-type="mention" data-id="" data-label="${title}" data-stub="true">[[${title}]]</span>`;
  });
}

export function buildBlocksFromMarkdown(
  bodyMarkdown: string,
  titleToPageId: Map<string, string>,
  mediaFileToAssetId: Map<string, string>,
): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const sections = splitBodySections(bodyMarkdown);

  for (const section of sections) {
    const { markdownParts, blocks: parsedBlocks } = extractEsianaBlocks(section);
    blocks.push(...parsedBlocks);

    for (const part of markdownParts) {
      const rewritten = rewriteWikilinksForImport(
        rewriteMediaPathsForImport(part, mediaFileToAssetId),
        titleToPageId,
      );
      if (!rewritten.trim()) continue;
      blocks.push({
        id: `restored-${randomUUID()}`,
        type: 'text-tiptap',
        x: 0,
        y: 0,
        w: 12,
        h: 10,
        isPrivate: false,
        visibility: 'Party',
        content: { markdown: rewritten },
      });
    }
  }

  return blocks;
}

export function frontMatterToMetadata(
  customFields: Record<string, string>,
): Record<string, unknown> | null {
  const metadata = frontMatterFieldsToMetadata(customFields);

  for (const sidecarKey of ['havenFields', 'projectFields'] as const) {
    const raw = customFields[sidecarKey];
    if (!raw?.trim()) continue;
    try {
      metadata[sidecarKey] = JSON.parse(raw) as unknown;
    } catch {
      metadata[sidecarKey] = raw;
    }
  }

  const importTags: string[] = [];
  for (const [key, value] of Object.entries(customFields)) {
    if (key.startsWith('import_tag_') && value.trim()) {
      importTags.push(value.trim());
    }
  }
  if (importTags.length > 0) {
    metadata.importMetadata = {
      ...(typeof metadata.importMetadata === 'object' && metadata.importMetadata
        ? (metadata.importMetadata as Record<string, unknown>)
        : {}),
      tags: importTags,
    };
  }
  return Object.keys(metadata).length > 0 ? metadata : null;
}

function treeDepth(
  pageId: string,
  parentById: Map<string, string | null>,
): number {
  let depth = 0;
  let current: string | null | undefined = pageId;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const parent = parentById.get(current);
    if (!parent) break;
    depth += 1;
    current = parent;
  }

  return depth;
}

function resolveBackupDiscoverability(
  row: Record<string, unknown>,
): string | undefined {
  if (isValidDiscoverability(row.discoverability as string)) {
    return row.discoverability as string;
  }
  if (row.isPublic === true) return CampaignDiscoverability.PUBLIC;
  if (row.isPublicViewable === true) return CampaignDiscoverability.UNLISTED;
  if (typeof row.isPublic === 'boolean' || typeof row.isPublicViewable === 'boolean') {
    return CampaignDiscoverability.PRIVATE;
  }
  return undefined;
}

async function restoreFullCampaignSettings(
  campaignId: string,
  campaignJson: Record<string, unknown>,
): Promise<void> {
  const campaign = campaignJson.campaign;
  if (!campaign || typeof campaign !== 'object') return;

  const row = campaign as Record<string, unknown>;
  const discoverability = resolveBackupDiscoverability(row);
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      ...(typeof row.description === 'string' ? { description: row.description } : {}),
      ...(typeof row.language === 'string' ? { language: row.language } : {}),
      ...(typeof row.gameSystem === 'string'
        ? { gameSystem: normalizeGameSystemSlug(row.gameSystem) ?? row.gameSystem }
        : {}),
      ...(typeof row.customGameSystemName === 'string'
        ? { customGameSystemName: row.customGameSystemName }
        : row.customGameSystemName === null
          ? { customGameSystemName: null }
          : {}),
      ...(row.sidebarConfig != null ? { sidebarConfig: row.sidebarConfig as never } : {}),
      ...(row.dashboardConfig != null
        ? { dashboardConfig: row.dashboardConfig as never }
        : {}),
      ...(row.appearanceProfile != null
        ? { appearanceProfile: row.appearanceProfile as never }
        : {}),
      ...(typeof row.themePreset === 'string' ? { themePreset: row.themePreset } : {}),
      ...(discoverability
        ? { discoverability: normalizeDiscoverability(discoverability) }
        : {}),
    },
  });

  const fantasyCalendars = row.fantasyCalendars;
  if (Array.isArray(fantasyCalendars)) {
    for (const calendar of fantasyCalendars) {
      if (!calendar || typeof calendar !== 'object') continue;
      const cal = calendar as Record<string, unknown>;
      if (typeof cal.id !== 'string') continue;
      await prisma.fantasyCalendar.upsert({
        where: { id: cal.id },
        create: {
          id: cal.id,
          campaignId,
          name: String(cal.name ?? 'Imported Calendar'),
          isMasterTime: Boolean(cal.isMasterTime),
          epochOffset: BigInt(String(cal.epochOffset ?? '0')),
          weekdays: (cal.weekdays ?? []) as never,
          months: (cal.months ?? []) as never,
          seasons: (cal.seasons ?? []) as never,
          moons: (cal.moons ?? []) as never,
          leapDays: (cal.leapDays ?? []) as never,
        },
        update: {
          name: String(cal.name ?? 'Imported Calendar'),
          isMasterTime: Boolean(cal.isMasterTime),
          epochOffset: BigInt(String(cal.epochOffset ?? '0')),
          weekdays: (cal.weekdays ?? []) as never,
          months: (cal.months ?? []) as never,
          seasons: (cal.seasons ?? []) as never,
          moons: (cal.moons ?? []) as never,
          leapDays: (cal.leapDays ?? []) as never,
        },
      });
    }
  }

  const pluginSettings = row.pluginSettings;
  if (Array.isArray(pluginSettings)) {
    for (const setting of pluginSettings) {
      if (!setting || typeof setting !== 'object') continue;
      const entry = setting as Record<string, unknown>;
      if (typeof entry.pluginId !== 'string') continue;
      await prisma.campaignPluginSetting.upsert({
        where: {
          campaignId_pluginId: {
            campaignId,
            pluginId: entry.pluginId,
          },
        },
        create: {
          campaignId,
          pluginId: entry.pluginId,
          isEnabled: Boolean(entry.isEnabled),
          config: (entry.config ?? {}) as never,
        },
        update: {
          isEnabled: Boolean(entry.isEnabled),
          config: (entry.config ?? {}) as never,
        },
      });
    }
  }
}

export async function processCampaignBackupRestore(
  campaignId: string,
  opts?: { taskId?: string },
): Promise<void> {
  const task =
    opts?.taskId != null
      ? ({ id: opts.taskId } as { id: string })
      : createBackgroundTask({
          taskName: 'Esiana Backup Restore',
          targetCampaign: campaignId,
          type: 'AD_HOC',
          status: 'PENDING',
          progress: 0,
          abortable: false,
        });

  try {
    updateBackgroundTask(task.id, { status: 'PROCESSING', progress: 5 });

    const backupAsset = await prisma.asset.findFirst({
      where: {
        campaignId,
        type: 'campaign-backup-zip',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!backupAsset) {
      throw new Error('No campaign-backup-zip asset found for this campaign');
    }

    const zipFilePath = path.join(env.uploadsDir, path.basename(backupAsset.url));
    const zipBuffer = await fs.readFile(zipFilePath);
    const zip = await JSZip.loadAsync(zipBuffer);

    const manifestRaw = await zip.file('manifest.json')?.async('string');
    if (!manifestRaw) throw new Error('Backup manifest.json is missing');
    const manifest = parseManifest(JSON.parse(manifestRaw));

    updateBackgroundTask(task.id, { progress: 10 });

    const relationsRaw = await zip.file('sovereign/relations.json')?.async('string');
    const relations = parseRelations(
      relationsRaw ? JSON.parse(relationsRaw) : null,
    );

    const mediaManifestRaw = await zip
      .file('sovereign/media/manifest.json')
      ?.async('string');
    const mediaManifest = parseMediaManifest(
      mediaManifestRaw ? JSON.parse(mediaManifestRaw) : null,
    );

    const operationalRaw = await zip.file(SOVEREIGN_OPERATIONAL_PATH)?.async('string');
    const operationalPayload = parseOperationalPayload(
      operationalRaw ? JSON.parse(operationalRaw) : null,
    );

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        handle: true,
        campaignOwnerUserId: true,
      },
    });
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await prisma.pluginData.deleteMany({ where: { campaignId } });
    await prisma.wikiPage.deleteMany({ where: { campaignId } });
    await prisma.wikiLink.deleteMany({ where: { campaignId } });
    await prisma.tag.deleteMany({ where: { campaignId } });

    updateBackgroundTask(task.id, { progress: 20 });

    const mediaFileToAssetId = new Map<string, string>();
    for (const assetEntry of mediaManifest.assets) {
      const zipPath = `sovereign/media/${assetEntry.filename}`;
      const file = zip.file(zipPath);
      if (!file) continue;

      const buffer = await file.async('nodebuffer');
      const existing = await prisma.asset.findFirst({
        where: { id: assetEntry.id, campaignId },
      });
      if (existing) {
        deleteAssetRecordFiles(existing);
        await prisma.asset.delete({ where: { id: existing.id } });
      }

      const result = await importFromPackBuffer({
        campaignId,
        buffer,
        filename: assetEntry.filename,
        assetId: assetEntry.id,
        assetType: assetEntry.type,
      });

      mediaFileToAssetId.set(assetEntry.filename, result.asset.id);
    }

    updateBackgroundTask(task.id, { progress: 35 });

    const markdownEntries = Object.values(zip.files).filter(
      (entry) =>
        !entry.dir &&
        entry.name.replace(/\\/g, '/').startsWith('sovereign/wiki/') &&
        entry.name.toLowerCase().endsWith('.md'),
    );

    const markdownByPageId = new Map<
      string,
      { title: string; body: string; customFields: Record<string, string> }
    >();

    for (const entry of markdownEntries) {
      const raw = await entry.async('string');
      const parsed = parseMarkdownFrontMatter(raw);
      const pageId = parsed.frontMatter.customFields.esiana_id?.trim();
      if (!pageId) continue;

      markdownByPageId.set(pageId, {
        title: parsed.frontMatter.title ?? pageId,
        body: parsed.bodyMarkdown,
        customFields: parsed.frontMatter.customFields,
      });
    }

    const titleToPageId = new Map<string, string>();
    for (const node of relations.tree) {
      titleToPageId.set(node.title.trim().toLowerCase(), node.pageId);
    }

    const parentById = new Map(
      relations.tree.map((node) => [node.pageId, node.parentId]),
    );

    const sortedTree = [...relations.tree].sort(
      (a, b) => treeDepth(a.pageId, parentById) - treeDepth(b.pageId, parentById),
    );

    updateBackgroundTask(task.id, { progress: 50 });

    for (const node of sortedTree) {
      const markdown = markdownByPageId.get(node.pageId);
      const customFields = markdown?.customFields ?? {};
      const templateType = customFields.templateType?.trim() || 'DEFAULT';
      const visibility = customFields.visibility?.trim() || 'Party';
      const metadata = frontMatterToMetadata(customFields);
      const blocks = markdown
        ? buildBlocksFromMarkdown(markdown.body, titleToPageId, mediaFileToAssetId)
        : [];

      const temporalMeta = extractTemporalFromFrontMatter(customFields);
      const temporalTimestamps = applySystemProvenanceTimestamps(
        'restore',
        temporalMeta,
      );

      await prisma.wikiPage.upsert({
        where: { id: node.pageId },
        create: {
          id: node.pageId,
          campaignId,
          title: markdown?.title ?? node.title,
          parentId: node.parentId,
          templateType,
          visibility,
          metadata: metadata as never,
          blocks: blocks as never,
          mapAssetId: node.mapAssetId ?? null,
          ...(temporalTimestamps.createdAt
            ? { createdAt: temporalTimestamps.createdAt }
            : {}),
          ...(temporalTimestamps.updatedAt
            ? { updatedAt: temporalTimestamps.updatedAt }
            : {}),
        },
        update: {
          title: markdown?.title ?? node.title,
          parentId: node.parentId,
          templateType,
          visibility,
          metadata: metadata as never,
          blocks: blocks as never,
          mapAssetId: node.mapAssetId ?? null,
          ...(temporalTimestamps.updatedAt
            ? { updatedAt: temporalTimestamps.updatedAt }
            : {}),
        },
      });
    }

    updateBackgroundTask(task.id, { progress: 70 });

    for (const link of relations.links) {
      await prisma.wikiLink.upsert({
        where: {
          sourcePageId_targetPageId: {
            sourcePageId: link.sourcePageId,
            targetPageId: link.targetPageId,
          },
        },
        create: {
          campaignId,
          sourcePageId: link.sourcePageId,
          targetPageId: link.targetPageId,
        },
        update: {},
      });
    }

    for (const pin of relations.mapPins ?? []) {
      if (!pin.assetId || (!pin.targetPageId && !pin.targetAssetId)) continue;
      await prisma.mapPin.upsert({
        where: { id: pin.id },
        create: {
          id: pin.id,
          assetId: pin.assetId,
          targetPageId: pin.targetPageId,
          targetAssetId: pin.targetAssetId,
          label: pin.label,
          pinType: pin.pinType ?? 'Location',
          x_coordinate: pin.x_coordinate,
          y_coordinate: pin.y_coordinate,
        },
        update: {
          assetId: pin.assetId,
          targetPageId: pin.targetPageId,
          targetAssetId: pin.targetAssetId,
          label: pin.label,
          pinType: pin.pinType ?? 'Location',
          x_coordinate: pin.x_coordinate,
          y_coordinate: pin.y_coordinate,
        },
      });
    }

    const tagMetaByName = new Map<
      string,
      { label: string; icon: string | null; color: string | null }
    >();
    for (const tagEntry of relations.tags) {
      if (!tagMetaByName.has(tagEntry.tagName)) {
        tagMetaByName.set(tagEntry.tagName, {
          label: tagEntry.tagLabel,
          icon:
            typeof tagEntry.tagIcon === 'string' ? tagEntry.tagIcon : null,
          color:
            typeof tagEntry.tagColor === 'string' ? tagEntry.tagColor : null,
        });
      }
    }

    for (const [tagName, meta] of tagMetaByName) {
      const tag = await prisma.tag.upsert({
        where: {
          campaignId_name: {
            campaignId,
            name: tagName,
          },
        },
        create: {
          campaignId,
          name: tagName,
          label: meta.label,
          icon: meta.icon,
          color: meta.color,
        },
        update: {
          label: meta.label,
          icon: meta.icon,
          color: meta.color,
        },
      });

      const pageIds = relations.tags
        .filter((entry) => entry.tagName === tagName)
        .map((entry) => entry.pageId);

      if (pageIds.length > 0) {
        await prisma.tag.update({
          where: { id: tag.id },
          data: {
            pages: {
              connect: pageIds.map((pageId) => ({ id: pageId })),
            },
          },
        });
      }
    }

    updateBackgroundTask(task.id, { progress: 82 });

    const operationalCounts = await restoreOperationalPayload(
      campaignId,
      operationalPayload,
    );

    const slugToPageId = new Map<string, string>();
    for (const node of sortedTree) {
      const markdown = markdownByPageId.get(node.pageId);
      const customFields = markdown?.customFields ?? {};
      const slug = resolveWikiPageSlug(
        { title: markdown?.title ?? node.title, metadata: frontMatterToMetadata(customFields) },
        customFields.slug,
      );
      slugToPageId.set(slug, node.pageId);
    }

    const knowledgeRaw = await zip.file(SOVEREIGN_KNOWLEDGE_PATH)?.async('string');
    const knowledgeCounts = knowledgeRaw
      ? await restoreKnowledgePayload(
          campaignId,
          JSON.parse(knowledgeRaw),
          slugToPageId,
        )
      : { aliasCount: 0, claimCount: 0 };

    await bootstrapPackSatelliteRows({
      campaignId,
      campaignHandle: campaign.handle,
      actorUserId: campaign.campaignOwnerUserId,
      slugToPageId,
      assetPathToId: new Map(),
    });

    if (manifest.exportKind === 'full') {
      const fullRaw = await zip.file('esiana/campaign.json')?.async('string');
      if (fullRaw) {
        await restoreFullCampaignSettings(
          campaignId,
          JSON.parse(fullRaw) as Record<string, unknown>,
        );
      }
    }

    const linkEdgeCount = await rebuildWikiLinksForCampaign(campaignId);
    const { rebuildEntityRelationsForCampaign } = await import('./entityRelationSyncService.js');
    await rebuildEntityRelationsForCampaign(campaignId);
    const { rebuildNarrativeLifecycleForCampaign } = await import('./narrativeLifecycleService.js');
    await rebuildNarrativeLifecycleForCampaign(campaignId);

    updateBackgroundTask(task.id, {
      status: 'COMPLETED',
      progress: 100,
      metaMerge: {
        restoredPages: sortedTree.length,
        restoredAssets: mediaManifest.assets.length,
        wikiLinkEdges: linkEdgeCount,
        exportKind: manifest.exportKind,
        restoredHavens: operationalCounts.havenCount,
        restoredProjects: operationalCounts.projectCount,
        restoredPluginData: operationalCounts.pluginDataCount,
        restoredKnowledgeAliases: knowledgeCounts.aliasCount,
        restoredKnowledgeClaims: knowledgeCounts.claimCount,
      },
    });

    await notifyImportTaskComplete({
      campaignId,
      taskId: opts?.taskId,
      kind: 'restore',
    });
  } catch (error) {
    updateBackgroundTask(task.id, {
      status: 'FAILED',
      errorMessage:
        error instanceof Error ? error.message : 'Campaign backup restore failed',
    });
    await notifyImportTaskFailed({
      campaignId,
      taskId: opts?.taskId,
      kind: 'restore',
      message: error instanceof Error ? error.message : 'Campaign backup restore failed',
    });
    throw error;
  }
}
