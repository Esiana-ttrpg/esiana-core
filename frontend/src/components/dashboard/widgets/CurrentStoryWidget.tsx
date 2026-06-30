import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { CampaignCurrentStory } from '../CampaignCurrentStory';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface CurrentStoryWidgetProps {
  snapshot: CampaignNarrativeSnapshot | undefined;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function CurrentStoryWidget({
  snapshot,
  customizeMode,
  onHide,
}: CurrentStoryWidgetProps) {
  const { t } = useTranslation();

  return (
    <DashboardWidgetShell
      title={t('campaign.dashboard.widgetCurrentStory')}
      icon={<BookOpen className="size-4 text-amber-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {snapshot ? (
        <CampaignCurrentStory story={snapshot.currentStory} embedded />
      ) : (
        <p className="text-sm text-muted">
          {t('campaign.dashboard.narrativeSnapshotUnavailable')}
        </p>
      )}
    </DashboardWidgetShell>
  );
}
