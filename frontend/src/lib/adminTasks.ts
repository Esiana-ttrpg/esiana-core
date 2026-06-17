import { ApiError } from '@/lib/api';
import type { BackgroundTaskSnapshot, TaskHistoryPage } from '@/types/admin';

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

export async function fetchAdminTaskHistory(
  page = 1,
  limit = 25,
): Promise<TaskHistoryPage> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(`${API_BASE}/admin/tasks/history?${params}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Unable to load task history', res.status);
  }
  return res.json() as Promise<TaskHistoryPage>;
}

export async function dismissAdminTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/tasks/${encodeURIComponent(taskId)}/dismiss`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? 'Unable to dismiss task failure', res.status);
  }
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
