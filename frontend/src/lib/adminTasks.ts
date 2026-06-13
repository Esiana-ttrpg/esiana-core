import { ApiError } from '@/lib/api';
import type { BackgroundTaskSnapshot } from '@/types/admin';

const API_BASE = '/api';

export async function fetchAdminTasks(): Promise<BackgroundTaskSnapshot> {
  const res = await fetch(`${API_BASE}/admin/tasks`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Unable to load background tasks', res.status);
  }
  return res.json() as Promise<BackgroundTaskSnapshot>;
}

export async function abortAdminTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/tasks/${encodeURIComponent(taskId)}/abort`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Unable to abort task', res.status);
  }
}

