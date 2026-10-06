import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DowntimeHubOverviewPayload } from '@shared/downtimeHub';
import { fetchDowntimeHub } from '@/lib/downtime';
import { campaignDowntimeHubPath } from '@/lib/campaignPaths';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface HavenDowntimeWidgetProps {
  campaignHandle: string;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function HavenDowntimeWidget({ campaignHandle, customizeMode, onHide }: HavenDowntimeWidgetProps) {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<DowntimeHubOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchDowntimeHub(campaignHandle)
      .then((payload) => {
        if (!cancelled) setOverview(payload.overview ?? null);
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  return (
    <DashboardWidgetShell
      title={t('campaign.dashboard.widgetHavenDowntime')}
      icon={<Home className="size-4 text-primary" />}
      customizeMode={customizeMode}
      onHide={onHide}
      loading={loading}
    >
      <div className="flex h-full flex-col gap-3">
        {overview ? (
          <>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock3 className="size-4 text-muted" aria-hidden />
              <span>{overview.currentDowntimePeriod?.title ?? overview.currentTimeLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-serif text-2xl text-foreground">{overview.projects.length}</p>
                <p className="text-xs text-muted">{t('campaign.dashboard.havenDowntimeProjects')}</p>
              </div>
              <div>
                <p className="font-serif text-2xl text-foreground">{overview.havens.length}</p>
                <p className="text-xs text-muted">{t('campaign.dashboard.havenDowntimeHavens')}</p>
              </div>
            </div>
            {overview.recentActivity[0] ? (
              <p className="line-clamp-2 text-sm text-muted">
                {t('campaign.dashboard.havenDowntimeLatest', {
                  activity: overview.recentActivity[0].title,
                })}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">{t('campaign.dashboard.havenDowntimeEmpty')}</p>
        )}
        <Link className="mt-auto text-sm font-medium text-primary hover:underline" to={campaignDowntimeHubPath(campaignHandle)}>
          {t('campaign.dashboard.havenDowntimeOpen')}
        </Link>
      </div>
    </DashboardWidgetShell>
  );
}
