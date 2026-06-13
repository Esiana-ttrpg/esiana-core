import { Sparkles } from 'lucide-react';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface CampaignPulseWidgetProps {
  pulse: DashboardSummary['campaignPulse'];
  customizeMode?: boolean;
  onHide?: () => void;
}

export function CampaignPulseWidget({
  pulse,
  customizeMode,
  onHide,
}: CampaignPulseWidgetProps) {
  const lines = pulse.lines;

  return (
    <DashboardWidgetShell
      title="Campaign Pulse"
      icon={<Sparkles className="size-4 text-amber-300" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {lines.length === 0 ? (
        <p className="text-sm text-muted">The campaign is quiet — for now.</p>
      ) : (
        <ul className="space-y-2 text-sm text-foreground">
          {lines.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-muted">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidgetShell>
  );
}
