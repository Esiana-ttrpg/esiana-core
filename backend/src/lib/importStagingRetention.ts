export const IMPORT_STAGING_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

export const IMPORT_STAGING_ASSET_TYPES = [
  'campaign-import-zip',
  'campaign-backup-zip',
  'campaign-export-zip',
] as const;

export type ImportStagingAssetType = (typeof IMPORT_STAGING_ASSET_TYPES)[number];

const IMPORT_STAGING_ASSET_TYPE_SET = new Set<string>(IMPORT_STAGING_ASSET_TYPES);

export function isImportStagingAssetType(type: string): type is ImportStagingAssetType {
  return IMPORT_STAGING_ASSET_TYPE_SET.has(type);
}

export function computeImportStagingExpiresAt(nowMs = Date.now()): Date {
  return new Date(nowMs + IMPORT_STAGING_RETENTION_MS);
}

export function buildImportStagingAssetData(input: {
  campaignId: string;
  url: string;
  type: ImportStagingAssetType;
  nowMs?: number;
}): {
  campaignId: string;
  url: string;
  type: ImportStagingAssetType;
  expiresAt: Date;
} {
  return {
    campaignId: input.campaignId,
    url: input.url,
    type: input.type,
    expiresAt: computeImportStagingExpiresAt(input.nowMs),
  };
}
