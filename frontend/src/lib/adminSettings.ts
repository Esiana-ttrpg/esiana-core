import { apiFetch } from '@/lib/api';
import type { SystemSettings, SystemSettingsPatch } from '@/types/admin';

export async function fetchAdminSettings(): Promise<SystemSettings> {
  const data = await apiFetch<{ settings: SystemSettings }>('/admin/settings');
  return data.settings;
}

export async function updateAdminSettings(
  patch: SystemSettingsPatch,
): Promise<SystemSettings> {
  const data = await apiFetch<{ settings: SystemSettings }>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.settings;
}

export async function sendAdminSmtpTestEmail(): Promise<{ ok: boolean; to: string }> {
  return apiFetch('/admin/settings/smtp/test', { method: 'POST' });
}
