export const CAMPAIGN_BACKUP_FORMAT = 'esiana-campaign-backup-v2' as const;

export type CampaignBackupExportKind = 'sovereign' | 'full';

export interface CampaignBackupManifest {
  format: typeof CAMPAIGN_BACKUP_FORMAT;
  exportKind: CampaignBackupExportKind;
  exportedAt: string;
  campaign: {
    id: string;
    name: string;
    handle: string;
    gameSystem: string | null;
    customGameSystemName?: string | null;
    language: string | null;
    version: number;
  };
  /** Present on full exports for manual member re-invite after restore. */
  exportedMemberEmails?: string[];
}

export interface SovereignMediaAssetEntry {
  id: string;
  filename: string;
  type: string;
  originalUrl: string;
}

export interface SovereignMediaManifest {
  assets: SovereignMediaAssetEntry[];
}

export interface SovereignRelationsLink {
  sourcePageId: string;
  targetPageId: string;
  sourceTitle: string;
  targetTitle: string;
}

export interface SovereignRelationsTag {
  pageId: string;
  tagName: string;
  tagLabel: string;
  tagIcon?: string | null;
  tagColor?: string | null;
}

export interface SovereignRelationsTreeNode {
  pageId: string;
  parentId: string | null;
  title: string;
  path: string;
  mapAssetId?: string | null;
}

export interface SovereignMapPinEntry {
  id: string;
  assetId: string;
  targetPageId: string | null;
  targetAssetId: string | null;
  label: string | null;
  pinType: string;
  x_coordinate: number;
  y_coordinate: number;
}

export interface SovereignRelations {
  links: SovereignRelationsLink[];
  tags: SovereignRelationsTag[];
  tree: SovereignRelationsTreeNode[];
  mapPins?: SovereignMapPinEntry[];
}

/** Lore claims and historical aliases in sovereign/knowledge.json (optional in older zips). */
export type SovereignKnowledge = import('../packKnowledgeImporter.js').PackKnowledge;

/** Wiki-linked operational state in sovereign/operational.json (optional in older zips). */
export interface SovereignOperational {
  downtimeHavens: Array<Record<string, unknown>>;
  downtimeProjects: Array<Record<string, unknown>>;
  pluginData: Array<Record<string, unknown>>;
  pluginSettings?: Array<Record<string, unknown>>;
}

export interface SovereignExportFile {
  path: string;
  content: string | Buffer;
}

export interface SovereignExportResult {
  manifest: CampaignBackupManifest;
  files: SovereignExportFile[];
}
