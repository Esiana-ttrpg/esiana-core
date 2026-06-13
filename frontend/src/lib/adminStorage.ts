import { apiFetch } from '@/lib/api';
import type { StorageDriverCapabilities } from '@/types/admin';

export interface StorageProviderRegistrationCapabilities {
  redirectDelivery?: boolean;
  metrics?: boolean;
  orphanDetection?: boolean;
}

export type StorageProviderHealthState = 'uninitialized' | 'healthy' | 'degraded';

export interface StorageDriverInfo {
  driverId: string;
  displayName: string;
  version: string;
  capabilities: StorageDriverCapabilities;
  registrationCapabilities: StorageProviderRegistrationCapabilities;
  health: StorageProviderHealthState;
  healthDetail?: string;
  isActive: boolean;
}

export interface AdminStorageHealthSummary {
  state: StorageProviderHealthState;
  detail?: string;
  activeProviderId: string;
}

export interface AdminStorageStatus {
  activeDriver: StorageDriverInfo;
  registeredDrivers: StorageDriverInfo[];
  health: AdminStorageHealthSummary;
  configSummary: Record<string, unknown>;
}

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

export interface AdminStorageMetrics {
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

export async function fetchAdminStorageStatus(): Promise<AdminStorageStatus> {
  return apiFetch<AdminStorageStatus>('/admin/storage/status');
}

export async function fetchAdminStorageMetrics(refresh = false): Promise<AdminStorageMetrics> {
  const query = refresh ? '?refresh=true' : '';
  return apiFetch<AdminStorageMetrics>(`/admin/storage/metrics${query}`);
}
