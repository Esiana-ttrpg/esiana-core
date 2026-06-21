import { prisma } from '../prisma.js';
import { updateBackgroundTask } from '../taskRegistry.js';
import {
  applyFantasyCalendarImport,
  FantasyCalendarImportError,
} from '../fantasyCalendarImport.js';
import {
  buildSkeletonParentKeyMap,
  importMarkdownPagesFromPack,
} from '../markdownPackImporter.js';
import { importPackAssets } from '../packAssetImporter.js';
import {
  applyPackRelations,
  resolvePackRelationsIds,
} from '../packRelationsImporter.js';
import {
  discoverPackContent,
  hasImportablePackContent,
} from '../packContentDiscovery.js';
import {
  applyPackCampaignConfig,
  bootstrapPackSatelliteRows,
} from '../packSatelliteBootstrap.js';
import { applyPackKnowledge } from '../packKnowledgeImporter.js';

export interface ContentPackImportOptions {
  campaignId: string;
  campaignSlug: string;
  userId: string;
  pluginId: string;
  packId: string;
  packPath: string;
  taskId?: string;
}

export interface ContentPackImportResult {
  importedPageCount: number;
  importedAssetCount: number;
  importedCalendar: boolean;
  importedRelations: boolean;
  importedCampaignConfig: boolean;
  importedKnowledge: boolean;
}

function updateTask(
  taskId: string | undefined,
  patch: Parameters<typeof updateBackgroundTask>[1],
): void {
  if (taskId) updateBackgroundTask(taskId, patch);
}

export async function importContentPack(
  options: ContentPackImportOptions,
): Promise<ContentPackImportResult> {
  const { campaignId, campaignSlug, userId, packPath, taskId } = options;

  updateTask(taskId, { progress: 20, metaMerge: { phase: 'discovering-pack' } });

  let discovered;
  try {
    discovered = await discoverPackContent(packPath);
  } catch (error) {
    if (error instanceof FantasyCalendarImportError) {
      throw new Error(error.message);
    }
    throw error;
  }

  if (!hasImportablePackContent(discovered)) {
    throw new Error(
      'Content pack has no importable content (pages, assets, calendar.json, or relations.json)',
    );
  }

  let importedAssetCount = 0;
  let packAssetPathToId = new Map<string, string>();

  if (discovered.assetFileCount > 0) {
    updateTask(taskId, { progress: 30, metaMerge: { phase: 'importing-assets' } });
    const assetResult = await importPackAssets({ campaignId, packPath });
    importedAssetCount = assetResult.importedAssetCount;
    packAssetPathToId = assetResult.relativePathToAssetId;
  }

  let importedCalendar = false;
  if (discovered.calendar) {
    updateTask(taskId, { progress: 45, metaMerge: { phase: 'importing-calendar' } });
    await prisma.$transaction(async (tx) => {
      await applyFantasyCalendarImport(tx, campaignId, discovered.calendar!);
    });
    importedCalendar = true;
  }

  let importedPageCount = 0;
  let slugToPageId = new Map<string, string>();
  if (discovered.markdownFileCount > 0) {
    updateTask(taskId, { progress: 55, metaMerge: { phase: 'importing-pages' } });
    const skeletonParentMap = await buildSkeletonParentKeyMap(campaignId);
    const pageResult = await importMarkdownPagesFromPack({
      campaignId,
      packPath,
      skeletonParentMap,
      packAssetPathToId,
    });
    importedPageCount = pageResult.importedPageCount;
    slugToPageId = pageResult.slugToPageId;
  }

  let importedRelations = false;
  if (discovered.relations) {
    updateTask(taskId, { progress: 75, metaMerge: { phase: 'importing-relations' } });
    const resolved = resolvePackRelationsIds(
      discovered.relations,
      slugToPageId,
      packAssetPathToId,
    );
    await applyPackRelations(campaignId, resolved);
    importedRelations = true;
  }

  if (importedPageCount > 0) {
    updateTask(taskId, { progress: 85, metaMerge: { phase: 'post-sync' } });
    const { rebuildWikiLinksForCampaign } = await import('../wikiLinkService.js');
    await rebuildWikiLinksForCampaign(campaignId);
    const { rebuildEntityRelationsForCampaign } = await import('../entityRelationSyncService.js');
    await rebuildEntityRelationsForCampaign(campaignId);
    const { rebuildNarrativeLifecycleForCampaign } = await import('../narrativeLifecycleService.js');
    await rebuildNarrativeLifecycleForCampaign(campaignId);

    updateTask(taskId, { progress: 90, metaMerge: { phase: 'satellite-bootstrap' } });
    await bootstrapPackSatelliteRows({
      campaignId,
      campaignHandle: campaignSlug,
      actorUserId: userId,
      slugToPageId,
      assetPathToId: packAssetPathToId,
    });
  }

  let importedCampaignConfig = false;
  if (discovered.campaign) {
    await applyPackCampaignConfig(campaignId, discovered.campaign, {
      slugToPageId,
      assetPathToId: packAssetPathToId,
    });
    importedCampaignConfig = true;
  }

  let importedKnowledge = false;
  if (discovered.knowledge && slugToPageId.size > 0) {
    await applyPackKnowledge(campaignId, discovered.knowledge, slugToPageId);
    importedKnowledge = true;
  }

  updateTask(taskId, {
    progress: 95,
    metaMerge: {
      phase: 'import-complete',
      importedPageCount,
      importedAssetCount,
      importedCalendar,
      importedRelations,
      importedCampaignConfig,
      importedKnowledge,
    },
  });

  return {
    importedPageCount,
    importedAssetCount,
    importedCalendar,
    importedRelations,
    importedCampaignConfig,
    importedKnowledge,
  };
}
