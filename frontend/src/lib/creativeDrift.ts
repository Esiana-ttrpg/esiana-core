import type {
  CreativeDriftScanResult,
  DriftDispositionKind,
} from '@shared/creativeDrift';
import { apiFetch } from './api';

export type { CreativeDriftScanResult };

export async function fetchCreativeDrift(
  campaignHandle: string,
): Promise<CreativeDriftScanResult> {
  return apiFetch<CreativeDriftScanResult>(
    `/campaigns/${campaignHandle}/narrative/creative-drift`,
  );
}

export async function patchCreativeDriftDisposition(
  campaignHandle: string,
  payload: {
    fingerprint: string;
    disposition: DriftDispositionKind;
    snoozeUntil?: string | null;
    note?: string | null;
  },
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/narrative/creative-drift/dispositions`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function snoozeUntilDays(days: number): string {
  const until = new Date();
  until.setDate(until.getDate() + days);
  return until.toISOString();
}
