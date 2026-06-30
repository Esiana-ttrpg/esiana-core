import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CampaignContextRail } from '../CampaignContextRail';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface ExploreWidgetProps {
  campaignHandle: string;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function ExploreWidget({
  campaignHandle,
  customizeMode,
  onHide,
}: ExploreWidgetProps) {
  const { t } = useTranslation();

  return (
    <DashboardWidgetShell
      title={t('campaign.dashboard.widgetExplore')}
      icon={<Compass className="size-4 text-cyan-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      <CampaignContextRail campaignHandle={campaignHandle} embedded />
    </DashboardWidgetShell>
  );
}
