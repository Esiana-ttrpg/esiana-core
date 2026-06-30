import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RecentEntityFeedItem } from '@/lib/dashboardSummary';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import { RecentEntityFeed } from './RecentEntityFeed';

interface RecentLoreWidgetProps {
  items: RecentEntityFeedItem[];
  customizeMode?: boolean;
  onHide?: () => void;
}

export function RecentLoreWidget({ items, customizeMode, onHide }: RecentLoreWidgetProps) {
  const { t } = useTranslation();
  const loreOnly = items.filter((item) => item.entityType === 'WIKI_PAGE').slice(0, 3);

  return (
    <DashboardWidgetShell
      title={translateDashboardWidgetLabel('recentLore', 'Recent Lore')}
      icon={<BookOpen className="size-4 text-violet-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      <RecentEntityFeed
        items={loreOnly}
        emptyMessage={t('campaign.dashboard.recentLoreEmpty')}
      />
    </DashboardWidgetShell>
  );
}
