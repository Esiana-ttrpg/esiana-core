import path from 'node:path';
import { prisma } from '../prisma.js';
import { AssetTypes } from '../../types/domain.js';
import { ingestBinaryBuffer } from '../assetIngest.js';

const MAX_PLUGIN_ASSETS_PER_CAMPAIGN = 200;

export async function countPluginAssets(
  pluginId: string,
  campaignId: string,
): Promise<number> {
  return prisma.asset.count({
    where: {
      campaignId,
      type: AssetTypes.GENERIC,
      displayName: { startsWith: `plugin:${pluginId}:` },
    },
  });
}

export async function deletePluginAssets(
  pluginId: string,
  campaignId?: string,
): Promise<void> {
  await prisma.asset.deleteMany({
    where: {
      ...(campaignId ? { campaignId } : {}),
      type: AssetTypes.GENERIC,
      displayName: { startsWith: `plugin:${pluginId}:` },
    },
  });
}

export async function assertPluginAssetQuota(
  pluginId: string,
  campaignId: string,
): Promise<void> {
  const count = await countPluginAssets(pluginId, campaignId);
  if (count >= MAX_PLUGIN_ASSETS_PER_CAMPAIGN) {
    throw new Error(
      `Plugin "${pluginId}" asset quota exceeded for campaign (${MAX_PLUGIN_ASSETS_PER_CAMPAIGN})`,
    );
  }
}

export function buildPluginAssetDisplayName(
  pluginId: string,
  label: string,
): string {
  return `plugin:${pluginId}:${label}`;
}

export function buildPluginAssetUri(assetId: string): string {
  return `storage://asset/${assetId}`;
}

function extensionFromContentType(contentType: string): string {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
  };
  return map[normalized] ?? '.bin';
}

export async function uploadPluginAsset(input: {
  pluginId: string;
  campaignId: string;
  buffer: Buffer;
  contentType: string;
  label?: string;
  uploadedByUserId?: string | null;
}): Promise<{ assetId: string; uri: string }> {
  await assertPluginAssetQuota(input.pluginId, input.campaignId);
  const label = (input.label ?? 'upload').trim() || 'upload';
  const ext =
    path.extname(label) ||
    extensionFromContentType(input.contentType);
  const ingested = await ingestBinaryBuffer({
    campaignId: input.campaignId,
    buffer: input.buffer,
    type: AssetTypes.GENERIC,
    ext,
    mimeType: input.contentType,
    uploadedByUserId: input.uploadedByUserId,
  });
  await prisma.asset.update({
    where: { id: ingested.asset.id },
    data: {
      displayName: buildPluginAssetDisplayName(input.pluginId, label),
    },
  });
  return {
    assetId: ingested.asset.id,
    uri: buildPluginAssetUri(ingested.asset.id),
  };
}
