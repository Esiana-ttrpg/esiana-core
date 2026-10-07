import type { CampaignEra } from './prismaClient.js';
/** Structural recurrence uses authored order and all eras, independent of disclosure. */
export function nextEraOccurrence(eras: Pick<CampaignEra, 'calendarId' | 'sortOrder' | 'epochStartMinute' | 'epochEndMinute'>[], calendarId: string, originMinute: bigint, occurrence: number, interval: number): bigint | null {
  const track = eras.filter(era => era.calendarId === calendarId).sort((a, b) => a.sortOrder - b.sortOrder);
  const origin = track.findIndex(era => (era.epochStartMinute == null || originMinute >= era.epochStartMinute)
    && (era.epochEndMinute == null || originMinute < era.epochEndMinute));
  if (origin < 0) return null;
  // Unbounded starts cannot produce a dated occurrence; retain their sequence position.
  return track[origin + occurrence * interval]?.epochStartMinute ?? null;
}
