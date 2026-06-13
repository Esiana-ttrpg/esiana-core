import { ApiError } from '@/lib/api';

const API_BASE = '/api';

export interface StorageStats {
  uploadsDir: string;
  totalFiles: number;
  referencedFiles: number;
  orphanFiles: number;
  totalBytes: number;
  reclaimableBytes: number;
  totalBytesFormatted: string;
  reclaimableBytesFormatted: string;
}

export interface SystemLogEntry {
  id: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export async function fetchStorageStats(): Promise<StorageStats> {
  const res = await fetch(`${API_BASE}/admin/system/storage-stats`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Unable to load storage stats', res.status);
  }
  const data = (await res.json()) as { storage: StorageStats };
  return data.storage;
}

export async function pruneUnusedMedia(): Promise<{
  prune: { deletedCount: number; freedBytes: number; freedBytesFormatted: string };
  storage: StorageStats;
}> {
  const res = await fetch(`${API_BASE}/admin/system/prune-media`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Prune operation failed', res.status);
  }
  return res.json() as Promise<{
    prune: { deletedCount: number; freedBytes: number; freedBytesFormatted: string };
    storage: StorageStats;
  }>;
}

export async function fetchSystemLogs(limit = 100): Promise<SystemLogEntry[]> {
  const res = await fetch(
    `${API_BASE}/admin/system/logs?limit=${encodeURIComponent(String(limit))}`,
    { credentials: 'include' },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Unable to load system logs', res.status);
  }
  const data = (await res.json()) as { logs: SystemLogEntry[] };
  return data.logs;
}

export async function downloadSystemBackup(): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/system/backup`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Backup download failed', res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename = match?.[1] ?? `esiana-system-backup-${Date.now()}.db`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
