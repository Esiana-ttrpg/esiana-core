import type { DashboardSummary } from '@/lib/dashboardSummary';
import { TYPE_META_CLASS } from '@/lib/surfaceLayout';

interface CampaignStatusStripProps {
  statusStrip: DashboardSummary['statusStrip'];
}

export function CampaignStatusStrip({ statusStrip }: CampaignStatusStripProps) {
  const segments = [
    statusStrip.cadenceLabel,
    statusStrip.worldTimeLabel,
    statusStrip.sessionLabel,
    statusStrip.partyLabel,
    statusStrip.recruitmentLabel,
  ].filter((value): value is string => Boolean(value?.trim()));

  if (segments.length === 0) return null;

  return (
    <details className="group mt-1 max-w-xl">
      <summary
        className={`${TYPE_META_CLASS} cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden`}
      >
        <span className="group-open:hidden">Campaign status</span>
        <span className="hidden group-open:inline">Hide status</span>
      </summary>
      <p
        className={`${TYPE_META_CLASS} mt-2 normal-case tracking-normal`}
        aria-label="Campaign status"
      >
        {segments.join(' · ')}
      </p>
    </details>
  );
}
