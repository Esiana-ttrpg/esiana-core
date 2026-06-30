import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { CampaignPartySurface } from '../CampaignPartySurface';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface PartyRosterWidgetProps {
  snapshot: CampaignNarrativeSnapshot | undefined;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function PartyRosterWidget({
  snapshot,
  customizeMode,
  onHide,
}: PartyRosterWidgetProps) {
  const { t } = useTranslation();

  return (
    <DashboardWidgetShell
      title={t('campaign.dashboard.widgetPartyRoster')}
      icon={<Users className="size-4 text-emerald-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {snapshot ? (
        <CampaignPartySurface roster={snapshot.partyRoster} embedded />
      ) : (
        <p className="text-sm text-muted">
          {t('campaign.dashboard.narrativeSnapshotUnavailable')}
        </p>
      )}
    </DashboardWidgetShell>
  );
}
