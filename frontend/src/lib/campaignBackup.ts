import { apiFetch } from './api';
import { assetUploadBase } from './sessionAudio';
import { getOrCreateUploadRetryKey, resumeStoredUpload } from './uploadRetryKey';
const API_BASE = '/api';

export async function downloadCampaignBackup(
  campaignHandle: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/campaigns/${encodeURIComponent(campaignHandle)}/backup`,
    { credentials: 'include' },
  );

  if (!res.ok) {
    let message = 'Campaign backup failed';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename =
    match?.[1] ?? `esiana-campaign-${campaignHandle}-${Date.now()}.zip`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function restoreCampaignBackup(
  campaignHandle: string,
  backupZipFile: File,
  onProgress?: (percent: number) => void,
): Promise<{ taskId: string }> {
  const base = assetUploadBase(campaignHandle);
  const key = `esiana-backup:${campaignHandle}:${backupZipFile.name}:${backupZipFile.size}:${backupZipFile.lastModified}`;
  const creationKey = `${key}:create-key`;
  let upload = await resumeStoredUpload(key, (id) => apiFetch<{ id: string; offsetBytes: string; status: string }>(`${base}/${id}`));
  if (upload && ['appending', 'finalizing'].includes(upload.status)) throw new Error('This backup upload is still processing. Retry shortly to resume.');
  if (upload && !['uploading', 'complete'].includes(upload.status)) localStorage.removeItem(creationKey);
  if (!upload || !['uploading', 'complete'].includes(upload.status)) {
    const retryKey = getOrCreateUploadRetryKey(creationKey);
    upload = await apiFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': retryKey }, body: JSON.stringify({ purpose: 'campaign_backup', name: backupZipFile.name, sizeBytes: String(backupZipFile.size) }) });
  }
  localStorage.setItem(key, upload!.id);
  let offset = Number(upload!.offsetBytes);
  while (offset < backupZipFile.size) {
    const result = await apiFetch<{ offsetBytes: string }>(`${base}/${upload!.id}`, { method: 'PATCH',
      headers: { 'Content-Type': 'application/octet-stream', 'Upload-Offset': String(offset) }, body: backupZipFile.slice(offset, offset + 8388608) });
    offset = Number(result.offsetBytes); onProgress?.(Math.round(offset / backupZipFile.size * 100));
  }
  await apiFetch(`${base}/${upload!.id}/finalize`, { method: 'POST', body: '{}' });

  const res = await fetch(
    `${API_BASE}/campaigns/${encodeURIComponent(campaignHandle)}/backup/restore`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: upload!.id }),
    },
  );

  if (!res.ok) {
    let message = 'Campaign restore failed';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  localStorage.removeItem(key);
  localStorage.removeItem(creationKey);
  return (await res.json()) as { taskId: string };
}
