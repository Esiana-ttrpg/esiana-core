import { Globe2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface WorldSnapshotWidgetProps {
  snapshot?: CampaignNarrativeSnapshot;
  eraName?: string | null;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function WorldSnapshotWidget({ snapshot, eraName, customizeMode, onHide }: WorldSnapshotWidgetProps) {
  const location = snapshot?.campaignState.location;
  return <DashboardWidgetShell title="World Snapshot" icon={<Globe2 className="size-4 text-primary" />} customizeMode={customizeMode} onHide={onHide}>
    <div className="space-y-3">
      {eraName ? <p className="text-xs text-muted">{eraName}</p> : null}
      <p className="type-prose text-base text-foreground">{location?.value ?? 'Explore your campaign world.'}</p>
      {location?.href ? <Link to={location.href} className="inline-block text-sm text-primary hover:underline">Explore location</Link> : null}
    </div>
  </DashboardWidgetShell>;
}
