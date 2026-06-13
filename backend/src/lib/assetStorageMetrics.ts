import { prisma } from './prisma.js';
import { AssetTypes } from '../types/domain.js';
import { formatBytes } from './storageMaintenance.js';
import { FILESYSTEM_PROVIDER_ID } from './storage/filesystemDriver.js';
import { parseStoragePointer } from './storage/storagePointer.js';
import {
  getActiveProviderHealth,
  getActiveProviderId,
  getRegisteredProviders,
  getRegistration,
  resolveStorageProvider,
} from './storage/storageRegistry.js';
import type { StorageDriver } from './storage/types.js';

const METRICS_CACHE_TTL_MS = 30 * 60 * 1000;
const REMOTE_METRICS_SAMPLE_SIZE = 200;

interface MetricsCacheEntry {
  expiresAt: number;
  payload: AssetStorageMetricsPayload;
}

let metricsCache: MetricsCacheEntry | null = null;

export interface AssetCategoryBreakdown {
  maps: number;
  images: number;
  icons: number;
  scenes: number;
  other: number;
}

export interface LargestAssetMetric {
  assetId: string | null;
  type: string;
  pointer: string;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface AssetStorageMetricsPayload {
  accuracy: 'exact' | 'estimate';
  assetCount: number;
  uniqueObjectCount: number;
  totalBytes: number;
  totalBytesFormatted: string;
  sampledObjectCount?: number;
  categories: AssetCategoryBreakdown;
  largestAssets: LargestAssetMetric[];
  orphanFileCount?: number;
  cachedAt: string;
  cacheExpiresAt: string;
}

function categorizeAssetType(type: string): keyof AssetCategoryBreakdown {
  if (type === AssetTypes.MAP) return 'maps';
  if (type === AssetTypes.SCENE) return 'scenes';
  if (type === AssetTypes.TAG_ICON || type === AssetTypes.SIDEBAR_ICON) return 'icons';
  if (
    type === AssetTypes.GENERIC ||
    type === AssetTypes.CAMPAIGN_COVER
  ) {
    return 'images';
  }
  return 'other';
}

async function collectAssetPointers(): Promise<
  Array<{ assetId: string; type: string; pointer: string }>
> {
  const assets = await prisma.asset.findMany({
    select: {
      id: true,
      type: true,
      url: true,
      displayUrl: true,
      thumbnailUrl: true,
    },
  });

  const rows: Array<{ assetId: string; type: string; pointer: string }> = [];
  for (const asset of assets) {
    for (const pointer of [asset.url, asset.displayUrl, asset.thumbnailUrl]) {
      if (!pointer) continue;
      if (!parseStoragePointer(pointer)) continue;
      rows.push({ assetId: asset.id, type: asset.type, pointer });
    }
  }
  return rows;
}

async function statPointer(
  driver: StorageDriver,
  key: string,
): Promise<number | null> {
  if (typeof driver.statObject === 'function') {
    const stat = await driver.statObject(key);
    return stat?.sizeBytes ?? null;
  }
  return null;
}

async function computeFilesystemMetrics(
  pointerRows: Array<{ assetId: string; type: string; pointer: string }>,
  assetCount: number,
  categories: AssetCategoryBreakdown,
): Promise<AssetStorageMetricsPayload> {
  const uniquePointers = [...new Set(pointerRows.map((row) => row.pointer))];
  const pointerToAsset = new Map<string, { assetId: string; type: string }>();
  for (const row of pointerRows) {
    if (!pointerToAsset.has(row.pointer)) {
      pointerToAsset.set(row.pointer, { assetId: row.assetId, type: row.type });
    }
  }

  let totalBytes = 0;
  const sized: LargestAssetMetric[] = [];

  for (const pointer of uniquePointers) {
    const resolved = parseStoragePointer(pointer);
    if (!resolved) continue;
    const driver = resolveStorageProvider(resolved.providerId);
    if (!driver) continue;
    const size = await statPointer(driver, resolved.key);
    if (size === null) continue;
    totalBytes += size;
    const meta = pointerToAsset.get(pointer);
    sized.push({
      assetId: meta?.assetId ?? null,
      type: meta?.type ?? 'unknown',
      pointer,
      sizeBytes: size,
      sizeFormatted: formatBytes(size),
    });
  }

  sized.sort((a, b) => b.sizeBytes - a.sizeBytes);

  let orphanFileCount: number | undefined;
  const registration = getRegistration(FILESYSTEM_PROVIDER_ID);
  if (registration?.capabilities.orphanDetection) {
    const driver = resolveStorageProvider(FILESYSTEM_PROVIDER_ID);
    if (driver && typeof driver.listObjects === 'function') {
      const referencedKeys = new Set(
        uniquePointers
          .map((pointer) => parseStoragePointer(pointer)?.key)
          .filter((key): key is string => Boolean(key)),
      );
      const listed = await driver.listObjects({ maxKeys: 10_000 });
      orphanFileCount = listed.filter((item) => !referencedKeys.has(item.key)).length;
    }
  }

  const now = new Date();
  return {
    accuracy: 'exact',
    assetCount,
    uniqueObjectCount: uniquePointers.length,
    totalBytes,
    totalBytesFormatted: formatBytes(totalBytes),
    categories,
    largestAssets: sized.slice(0, 10),
    orphanFileCount,
    cachedAt: now.toISOString(),
    cacheExpiresAt: new Date(now.getTime() + METRICS_CACHE_TTL_MS).toISOString(),
  };
}

async function computeRemoteEstimateMetrics(
  pointerRows: Array<{ assetId: string; type: string; pointer: string }>,
  assetCount: number,
  categories: AssetCategoryBreakdown,
): Promise<AssetStorageMetricsPayload> {
  const uniquePointers = [...new Set(pointerRows.map((row) => row.pointer))];
  const sample = uniquePointers.slice(0, REMOTE_METRICS_SAMPLE_SIZE);
  const pointerToAsset = new Map<string, { assetId: string; type: string }>();
  for (const row of pointerRows) {
    if (!pointerToAsset.has(row.pointer)) {
      pointerToAsset.set(row.pointer, { assetId: row.assetId, type: row.type });
    }
  }

  let sampledBytes = 0;
  const sized: LargestAssetMetric[] = [];

  for (const pointer of sample) {
    const parsed = parseStoragePointer(pointer);
    if (!parsed) continue;
    const driver = resolveStorageProvider(parsed.providerId);
    if (!driver) continue;
    const size = await statPointer(driver, parsed.key);
    if (size === null) continue;
    sampledBytes += size;
    const meta = pointerToAsset.get(pointer);
    sized.push({
      assetId: meta?.assetId ?? null,
      type: meta?.type ?? 'unknown',
      pointer,
      sizeBytes: size,
      sizeFormatted: formatBytes(size),
    });
  }

  sized.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const averageBytes =
    sample.length > 0 ? Math.round(sampledBytes / sample.length) : 0;
  const estimatedTotal = averageBytes * uniquePointers.length;

  const now = new Date();
  return {
    accuracy: 'estimate',
    assetCount,
    uniqueObjectCount: uniquePointers.length,
    sampledObjectCount: sample.length,
    totalBytes: estimatedTotal,
    totalBytesFormatted: formatBytes(estimatedTotal),
    categories,
    largestAssets: sized.slice(0, 10),
    cachedAt: now.toISOString(),
    cacheExpiresAt: new Date(now.getTime() + METRICS_CACHE_TTL_MS).toISOString(),
  };
}

export async function getAssetStorageMetrics(options?: {
  refresh?: boolean;
}): Promise<AssetStorageMetricsPayload> {
  const refresh = options?.refresh === true;
  const now = Date.now();
  if (!refresh && metricsCache && metricsCache.expiresAt > now) {
    return metricsCache.payload;
  }

  const assets = await prisma.asset.findMany({ select: { type: true } });
  const categories: AssetCategoryBreakdown = {
    maps: 0,
    images: 0,
    icons: 0,
    scenes: 0,
    other: 0,
  };
  for (const asset of assets) {
    categories[categorizeAssetType(asset.type)] += 1;
  }

  const pointerRows = await collectAssetPointers();
  const activeId = getActiveProviderId();
  const registration = getRegistration(activeId);
  const useExact =
    activeId === FILESYSTEM_PROVIDER_ID && registration?.capabilities.metrics === true;

  const payload = useExact
    ? await computeFilesystemMetrics(pointerRows, assets.length, categories)
    : await computeRemoteEstimateMetrics(pointerRows, assets.length, categories);

  metricsCache = {
    expiresAt: now + METRICS_CACHE_TTL_MS,
    payload,
  };

  return payload;
}

export function clearAssetStorageMetricsCacheForTests(): void {
  metricsCache = null;
}

export function getActiveStorageHealthSummary(): {
  state: ReturnType<typeof getActiveProviderHealth>['state'];
  detail?: string;
  activeProviderId: string;
} {
  const health = getActiveProviderHealth();
  return {
    state: health.state,
    detail: health.detail,
    activeProviderId: getActiveProviderId(),
  };
}

export function getRegisteredProviderSnapshots() {
  return getRegisteredProviders();
}
