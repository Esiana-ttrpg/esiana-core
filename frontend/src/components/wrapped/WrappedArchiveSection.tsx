import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { WrappedYearSummary } from '@shared/wrappedTypes';
import { fetchOwnerWrappedYears } from '@/lib/statsApi';
import { StatsSectionHeader } from '@/components/profile/stats/StatsChartFrame';

export function WrappedArchiveSection({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [years, setYears] = useState<WrappedYearSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    setLoaded(false);
    setError(false);
    setRetryToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchOwnerWrappedYears()
      .then((payload) => {
        if (cancelled) return;
        setYears(payload.years.filter((y) => y.eligible));
        setError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setYears([]);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  if (!loaded) return null;

  if (error) {
    return (
      <section className="space-y-3">
        <StatsSectionHeader
          category="campaigns"
          title={t('profile.wrapped.archiveHeading')}
          help={t('profile.wrapped.archiveHelp')}
        />
        <p className="text-sm text-destructive">{t('profile.wrapped.loadError')}</p>
        <button
          type="button"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted/40"
          onClick={retry}
        >
          {t('profile.wrapped.archiveRetry')}
        </button>
      </section>
    );
  }

  if (years.length === 0) return null;

  return (
    <section className="space-y-3">
      <StatsSectionHeader
        category="campaigns"
        title={t('profile.wrapped.archiveHeading')}
        help={t('profile.wrapped.archiveHelp')}
      />
      <ul className="flex flex-wrap gap-2">
        {years.map((row) => (
          <li key={row.year}>
            <Link
              to={`/users/${userId}/wrapped/${row.year}`}
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {row.edition === 'preview'
                ? t('profile.wrapped.openPreview', { year: row.year })
                : t('profile.wrapped.openYear', { year: row.year })}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
