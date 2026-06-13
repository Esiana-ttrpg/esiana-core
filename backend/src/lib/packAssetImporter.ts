import path from 'node:path';
import { importFromPack } from './assetImport.js';
import { listPackAssetFiles } from './packFsUtils.js';

export interface PackAssetImportResult {
  importedAssetCount: number;
  relativePathToAssetId: Map<string, string>;
}

export async function importPackAssets(options: {
  campaignId: string;
  packPath: string;
}): Promise<PackAssetImportResult> {
  const assetFiles = await listPackAssetFiles(options.packPath);
  const relativePathToAssetId = new Map<string, string>();

  for (const file of assetFiles) {
    const result = await importFromPack({
      campaignId: options.campaignId,
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
    });

    relativePathToAssetId.set(file.relativePath, result.asset.id);
    relativePathToAssetId.set(path.basename(file.relativePath), result.asset.id);
  }

  return {
    importedAssetCount: assetFiles.length,
    relativePathToAssetId,
  };
}
