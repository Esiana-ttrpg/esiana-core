import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { campaignPath, campaignSettingsPath } from '@/lib/campaignPaths';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { CampaignCurrentStory } from '../CampaignCurrentStory';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface CurrentStoryWidgetProps {
  snapshot: CampaignNarrativeSnapshot | undefined;
  campaignHandle?: string;
  canManageCampaign?: boolean;
  canCreatePages?: boolean;
  canScheduleSessions?: boolean;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function CurrentStoryWidget({
  snapshot,
  campaignHandle,
  canManageCampaign,
  canCreatePages = canManageCampaign,
  canScheduleSessions = canManageCampaign,
  customizeMode,
  onHide,
}: CurrentStoryWidgetProps) {
  const { t } = useTranslation();

  return (
    <DashboardWidgetShell
      title={t('campaign.dashboard.widgetCurrentStory')}
      icon={<BookOpen className="size-4 text-primary" />}
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
      {snapshot && !snapshot.currentStory.activeQuest && !snapshot.currentStory.activeThread && !snapshot.currentStory.arcTitle && canManageCampaign && campaignHandle ? (
        <nav aria-label="Begin your campaign" className="mt-4 flex flex-wrap gap-3 text-sm text-primary">
          {canCreatePages && <Link className="hover:underline" to={campaignPath(campaignHandle, 'party')}>Add characters</Link>}
          {canScheduleSessions && <Link className="hover:underline" to={campaignSettingsPath(campaignHandle, 'scheduling')}>Schedule a session</Link>}
          {canCreatePages && <Link className="hover:underline" to={campaignPath(campaignHandle, 'adventures')}>Start an adventure</Link>}
        </nav>
      ) : null}
    </DashboardWidgetShell>
  );
}
