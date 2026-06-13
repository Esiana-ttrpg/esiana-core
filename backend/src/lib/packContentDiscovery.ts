import {
  FantasyCalendarImportError,
  parseFantasyCalendarExport,
  type ParsedFantasyCalendarExport,
} from './fantasyCalendarImport.js';
import {
  listPackAssetFiles,
  listPackMarkdownFiles,
  packFileExists,
  readPackJsonFile,
} from './packFsUtils.js';
import { parsePackCampaignConfig, type PackCampaignConfigV1 } from './packCampaignConfig.js';
import { parsePackKnowledge, type PackKnowledge } from './packKnowledgeImporter.js';
import { parsePackRelations, type PackRelations } from './packRelationsImporter.js';

export interface DiscoveredPackContent {
  markdownFileCount: number;
  assetFileCount: number;
  calendar: ParsedFantasyCalendarExport | null;
  relations: PackRelations | null;
  campaign: PackCampaignConfigV1 | null;
  knowledge: PackKnowledge | null;
}

export function hasImportablePackContent(discovered: DiscoveredPackContent): boolean {
  return (
    discovered.markdownFileCount > 0 ||
    discovered.assetFileCount > 0 ||
    discovered.calendar !== null ||
    discovered.relations !== null
  );
}

export async function discoverPackContent(packPath: string): Promise<DiscoveredPackContent> {
  const markdownFiles = await listPackMarkdownFiles(packPath);
  const assetFiles = await listPackAssetFiles(packPath);

  let calendar: ParsedFantasyCalendarExport | null = null;
  if (await packFileExists(packPath, 'calendar.json')) {
    const raw = await readPackJsonFile(packPath, 'calendar.json');
    if (raw === null) {
      throw new FantasyCalendarImportError('calendar.json is not valid JSON');
    }
    try {
      calendar = parseFantasyCalendarExport(raw);
    } catch (error) {
      if (error instanceof FantasyCalendarImportError) throw error;
      throw new FantasyCalendarImportError(
        error instanceof Error ? error.message : 'Invalid calendar.json',
      );
    }
  }

  let relations: PackRelations | null = null;
  if (await packFileExists(packPath, 'relations.json')) {
    const raw = await readPackJsonFile(packPath, 'relations.json');
    if (raw === null) {
      throw new Error('relations.json is not valid JSON');
    }
    relations = parsePackRelations(raw);
    if (!relations) {
      throw new Error('relations.json has an invalid shape');
    }
  }

  let campaign: PackCampaignConfigV1 | null = null;
  if (await packFileExists(packPath, 'campaign.json')) {
    const raw = await readPackJsonFile(packPath, 'campaign.json');
    if (raw === null) {
      throw new Error('campaign.json is not valid JSON');
    }
    campaign = parsePackCampaignConfig(raw);
    if (!campaign) {
      throw new Error('campaign.json has an invalid shape');
    }
  }

  let knowledge: PackKnowledge | null = null;
  if (await packFileExists(packPath, 'knowledge.json')) {
    const raw = await readPackJsonFile(packPath, 'knowledge.json');
    if (raw === null) {
      throw new Error('knowledge.json is not valid JSON');
    }
    knowledge = parsePackKnowledge(raw);
    if (!knowledge) {
      throw new Error('knowledge.json has an invalid shape');
    }
  }

  return {
    markdownFileCount: markdownFiles.length,
    assetFileCount: assetFiles.length,
    calendar,
    relations,
    campaign,
    knowledge,
  };
}
