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
): Promise<{ taskId: string }> {
  const formData = new FormData();
  formData.append('backupZipFile', backupZipFile);

  const res = await fetch(
    `${API_BASE}/campaigns/${encodeURIComponent(campaignHandle)}/backup/restore`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData,
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

  return (await res.json()) as { taskId: string };
}
