import type { DashboardSummary } from '@/lib/dashboardSummary';

const HEADER_SUBTITLE_SEPARATOR = ' · ';
const HEADER_SUBTITLE_MAX_SEGMENTS = 3;

const HEADER_SUBTITLE_PRIORITY: Array<
  keyof DashboardSummary['statusStrip']
> = ['worldTimeLabel', 'sessionLabel', 'cadenceLabel'];

export function formatCampaignHeaderSubtitle(
  statusStrip: DashboardSummary['statusStrip'],
): string | null {
  const segments = HEADER_SUBTITLE_PRIORITY.map((key) =>
    statusStrip[key]?.trim(),
  ).filter((value): value is string => Boolean(value));

  if (segments.length === 0) return null;

  return segments.slice(0, HEADER_SUBTITLE_MAX_SEGMENTS).join(HEADER_SUBTITLE_SEPARATOR);
}
