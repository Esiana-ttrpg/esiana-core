import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { CampaignStateCard } from '../CampaignStateCard';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface CampaignAtAGlanceWidgetProps {
  snapshot: CampaignNarrativeSnapshot | undefined;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function CampaignAtAGlanceWidget({
  snapshot,
  customizeMode,
  onHide,
}: CampaignAtAGlanceWidgetProps) {
  const { t } = useTranslation();

  return (
    <DashboardWidgetShell
      title={t('campaign.dashboard.widgetCampaignAtAGlance')}
      icon={<LayoutGrid className="size-4 text-sky-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {snapshot ? (
        <CampaignStateCard campaignState={snapshot.campaignState} embedded />
      ) : (
        <p className="text-sm text-muted">
          {t('campaign.dashboard.narrativeSnapshotUnavailable')}
        </p>
      )}
    </DashboardWidgetShell>
  );
}
