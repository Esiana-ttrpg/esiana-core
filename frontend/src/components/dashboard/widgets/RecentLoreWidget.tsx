import { BookOpen } from 'lucide-react';
import type { RecentEntityFeedItem } from '@/lib/dashboardSummary';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import { RecentEntityFeed } from './RecentEntityFeed';

interface RecentLoreWidgetProps {
  items: RecentEntityFeedItem[];
  customizeMode?: boolean;
  onHide?: () => void;
}

export function RecentLoreWidget({ items, customizeMode, onHide }: RecentLoreWidgetProps) {
  const loreOnly = items.filter((item) => item.entityType === 'WIKI_PAGE').slice(0, 3);

  return (
    <DashboardWidgetShell
      title="Recently Expanded"
      icon={<BookOpen className="size-4 text-violet-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      <RecentEntityFeed
        items={loreOnly}
        emptyMessage="Start building your codex — lore pages will surface here as the world grows."
      />
    </DashboardWidgetShell>
  );
}
