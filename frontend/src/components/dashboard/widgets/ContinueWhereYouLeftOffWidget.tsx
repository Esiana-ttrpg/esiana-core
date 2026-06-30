import { Route } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ContinueWhereYouLeftOffItem } from '@/lib/dashboardSummary';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface ContinueWhereYouLeftOffWidgetProps {
  items: ContinueWhereYouLeftOffItem[];
  customizeMode?: boolean;
  onHide?: () => void;
}

export function ContinueWhereYouLeftOffWidget({
  items,
  customizeMode,
  onHide,
}: ContinueWhereYouLeftOffWidgetProps) {
  const { t } = useTranslation();

  return (
    <DashboardWidgetShell
      title="Continue Your Journey"
      icon={<Route className="size-4 text-indigo-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          {t('campaign.dashboard.continueWhereYouLeftOffEmpty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={`${item.entityType}-${item.entityId}`}>
              <Link
                to={item.href}
                className="block rounded-lg border border-border bg-background/50 px-3 py-2 transition-colors hover:border-indigo-500/40"
              >
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted">{item.reason}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidgetShell>
  );
}
