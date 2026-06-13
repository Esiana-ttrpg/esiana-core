import { apiFetch } from '@/lib/api';

export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string | null;
  isUpdateAvailable: boolean;
  changelog: string | null;
  htmlUrl?: string;
}

export async function fetchVersionCheck(): Promise<VersionCheckResult> {
  return apiFetch<VersionCheckResult>('/admin/system/check-version');
}
