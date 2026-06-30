import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { CampaignRecentActivity } from '../CampaignRecentActivity';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface RecentActivityWidgetProps {
  snapshot: CampaignNarrativeSnapshot | undefined;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function RecentActivityWidget({
  snapshot,
  customizeMode,
  onHide,
}: RecentActivityWidgetProps) {
  const { t } = useTranslation();

  return (
    <DashboardWidgetShell
      title={t('campaign.dashboard.widgetRecentActivity')}
      icon={<Activity className="size-4 text-violet-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {snapshot ? (
        <CampaignRecentActivity activity={snapshot.recentActivity} embedded />
      ) : (
        <p className="text-sm text-muted">
          {t('campaign.dashboard.narrativeSnapshotUnavailable')}
        </p>
      )}
    </DashboardWidgetShell>
  );
}
