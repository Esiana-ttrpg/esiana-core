import { prisma } from './prisma.js';
import { canAccessCampaign, isElevatedCampaignRole } from './acl.js';
import { canViewMapAsset } from './mapAssetVisibility.js';
import { resolveAssetVariantUrl } from './imageProcessing.js';
import { AssetTypes } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { isImportStagingAssetType } from './importStagingRetention.js';

export type AssetStreamRecord = {
  id: string;
  url: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  type: string;
  visibility: string;
  campaignId: string;
  expiresAt: Date | null;
  campaign: { discoverability: string; campaignOwnerUserId: string };
};

export async function loadCampaignRoleForUser(
  userId: string | undefined,
  campaignId: string,
): Promise<CampaignMemberRole | null> {
  if (!userId) return null;
  const membership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: { userId, campaignId },
    },
    select: { role: true },
  });
  return (membership?.role as CampaignMemberRole | undefined) ?? null;
}

export function parseAssetVariant(raw: unknown): 'full' | 'display' | 'thumb' {
  if (raw === 'full' || raw === 'display' || raw === 'thumb') return raw;
  return 'display';
}

export type AssetAccessResult =
  | { ok: true; role: CampaignMemberRole | null; variant: 'full' | 'display' | 'thumb' }
  | { ok: false; status: 403 | 404 | 410; message: string };

/**
 * Campaign-bound asset read gate. Access terminates at campaign membership +
 * role/capability — never from asset.visibility alone.
 */
export function evaluateAssetAccess(
  asset: AssetStreamRecord,
  role: CampaignMemberRole | null,
  variantInput: unknown,
  userId?: string | null,
): AssetAccessResult {
  if (asset.expiresAt && asset.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 410, message: 'Asset has expired' };
  }

  if (
    !canAccessCampaign(
      role,
      asset.campaign.discoverability,
      asset.campaign.campaignOwnerUserId,
      userId,
    )
  ) {
    return { ok: false, status: 403, message: 'Forbidden: no access to this asset' };
  }

  if (isImportStagingAssetType(asset.type)) {
    if (!isElevatedCampaignRole(role)) {
      return { ok: false, status: 403, message: 'Forbidden: gamemaster access required' };
    }
    return { ok: true, role, variant: 'full' };
  }

  if (asset.type === AssetTypes.MAP) {
    if (!canViewMapAsset(asset.visibility, role)) {
      return { ok: false, status: 404, message: 'Asset not found' };
    }
  } else if (!role) {
    // Non-map assets require campaign membership — container discoverability alone is insufficient.
    return { ok: false, status: 403, message: 'Forbidden: campaign membership required' };
  }

  let variant = parseAssetVariant(variantInput);
  if (
    variant === 'full' &&
    asset.type === AssetTypes.MAP &&
    !isElevatedCampaignRole(role)
  ) {
    variant = 'display';
  }

  const defaultVariant = asset.type === AssetTypes.MAP ? 'display' : 'full';
  if (variantInput === undefined) {
    variant = defaultVariant;
  }

  return { ok: true, role, variant };
}

export function resolveAssetVariantPointer(
  asset: Pick<AssetStreamRecord, 'url' | 'displayUrl' | 'thumbnailUrl' | 'type'>,
  variant: 'full' | 'display' | 'thumb',
): string | null {
  const chosenUrl = resolveAssetVariantUrl(asset, variant);
  if (!chosenUrl.trim()) return null;
  return chosenUrl;
}

/** @deprecated Use resolveAssetVariantPointer + parseStoragePointer for pointer-owned routing. */
export function resolveAssetFilename(
  asset: Pick<AssetStreamRecord, 'url' | 'displayUrl' | 'thumbnailUrl' | 'type'>,
  variant: 'full' | 'display' | 'thumb',
): string | null {
  const pointer = resolveAssetVariantPointer(asset, variant);
  if (!pointer) return null;
  const filename = pointer.split('/').pop() ?? '';
  if (pointer.startsWith('s3://')) {
    return pointer.slice('s3://'.length) || null;
  }
  if (!filename || filename === '.' || filename === '/') return null;
  return filename;
}

const assetSelect = {
  id: true,
  url: true,
  displayUrl: true,
  thumbnailUrl: true,
  type: true,
  visibility: true,
  campaignId: true,
  expiresAt: true,
  campaign: { select: { discoverability: true, campaignOwnerUserId: true } },
} as const;

export async function findAssetById(assetId: string) {
  return prisma.asset.findUnique({
    where: { id: assetId },
    select: assetSelect,
  });
}

export async function findAssetByStoredFilename(filename: string) {
  const suffix = `/uploads/${filename}`;
  return prisma.asset.findFirst({
    where: {
      OR: [
        { url: { endsWith: suffix } },
        { url: suffix },
        { displayUrl: { endsWith: suffix } },
        { displayUrl: suffix },
        { thumbnailUrl: { endsWith: suffix } },
        { thumbnailUrl: suffix },
      ],
    },
    select: assetSelect,
  });
}
