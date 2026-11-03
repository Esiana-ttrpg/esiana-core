import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { WrappedYearResponse } from '@shared/wrappedTypes';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { fetchOwnerWrappedYear } from '@/lib/statsApi';
import { WrappedStoryViewer } from '@/components/wrapped/WrappedStoryViewer';
import { WrappedExportControls } from '@/components/wrapped/WrappedExportControls';
import { StatsEmptyState, StatsLoadingState } from '@/components/profile/stats/StatsChartFrame';

export function WrappedYearPage() {
  const { id = '', year: yearParam = '' } = useParams<{ id: string; year: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const year = Number(yearParam);
  const [data, setData] = useState<WrappedYearResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSelf = Boolean(user && user.id === id);

  useEffect(() => {
    if (authLoading || !isSelf || !Number.isInteger(year)) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setUnavailable(false);
    void fetchOwnerWrappedYear(year)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setUnavailable(true);
          return;
        }
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isSelf, year]);

  if (authLoading) {
    return <StatsLoadingState message={t('profile.wrapped.loading')} />;
  }

  if (!user) {
    return <Navigate to={`/users/${id}?tab=writing`} replace />;
  }

  if (!isSelf) {
    return <Navigate to={`/users/${id}`} replace />;
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return <Navigate to={`/users/${id}?tab=writing`} replace />;
  }

  const backHref = `/users/${id}?tab=writing`;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <StatsLoadingState message={t('profile.wrapped.loading')} />
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <StatsEmptyState message={t('profile.wrapped.unavailable')} />
        <p className="mt-4 text-center text-sm">
          <a href={backHref} className="underline">
            {t('profile.wrapped.close')}
          </a>
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <StatsEmptyState message={t('profile.wrapped.loadError')} />
      </div>
    );
  }

  return (
    <WrappedStoryViewer
      data={data}
      backHref={backHref}
      renderFooter={(index, total) =>
        index === total - 1 ? <WrappedExportControls data={data} /> : null
      }
    />
  );
}
