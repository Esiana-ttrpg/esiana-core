import type { DowntimeGapOverlay } from '@shared/downtimeAnnotations';
import { apiFetch } from '@/lib/api';

export async function putDowntimeGapOverlay(
  campaignHandle: string,
  overlay: DowntimeGapOverlay,
): Promise<DowntimeGapOverlay> {
  const gapId = encodeURIComponent(overlay.gapId);
  const res = await apiFetch<{ overlay: DowntimeGapOverlay }>(
    `/campaigns/${campaignHandle}/downtime/gap-overlays/${gapId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promotedLabel: overlay.promotedLabel ?? null,
        annotations: overlay.annotations ?? [],
        locationMentions: overlay.locationMentions ?? [],
      }),
    },
  );
  return res.overlay;
}
