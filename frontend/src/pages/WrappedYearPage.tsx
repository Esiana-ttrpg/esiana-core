import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { WrappedYearResponse } from '@shared/wrappedTypes';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import {
  fetchOwnerWrappedYear,
  fetchPublishedWrappedYear,
} from '@/lib/statsApi';
import { WrappedStoryViewer } from '@/components/wrapped/WrappedStoryViewer';
import { WrappedExportControls } from '@/components/wrapped/WrappedExportControls';
import { WrappedManageSharing } from '@/components/wrapped/WrappedManageSharing';
import { StatsEmptyState, StatsLoadingState } from '@/components/profile/stats/StatsChartFrame';

export function WrappedYearPage() {
  const { id = '', year: yearParam = '' } = useParams<{ id: string; year: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const year = Number(yearParam);
  const [data, setData] = useState<WrappedYearResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);

  const isSelf = Boolean(user && user.id === id);
  const yearValid = Number.isInteger(year) && year >= 2000 && year <= 2100;

  useEffect(() => {
    if (authLoading || !yearValid) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setUnavailable(false);
    setNotFound(false);

    const load = isSelf
      ? fetchOwnerWrappedYear(year)
      : fetchPublishedWrappedYear(id, year);

    void load
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          if (isSelf) setUnavailable(true);
          else setNotFound(true);
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
  }, [authLoading, isSelf, year, id, yearValid]);

  if (authLoading) {
    return <StatsLoadingState message={t('profile.wrapped.loading')} />;
  }

  if (!yearValid) {
    return <Navigate to={id ? `/users/${id}?tab=writing` : '/wrapped'} replace />;
  }

  const backHref = isSelf ? `/users/${id}?tab=writing` : `/users/${id}`;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <StatsLoadingState message={t('profile.wrapped.loading')} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <StatsEmptyState message={t('profile.wrapped.publicNotFound')} />
        <p className="mt-4 text-center text-sm">
          <a href="/wrapped" className="underline">
            {t('profile.wrapped.intro.ctaLearn')}
          </a>
        </p>
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
    <>
      <WrappedStoryViewer
        data={data}
        backHref={backHref}
        renderHeaderActions={
          data.access === 'owner'
            ? () => (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => setManageOpen(true)}
                >
                  {t('profile.wrapped.manage.menu')}
                </button>
              )
            : undefined
        }
        renderFooter={(index, total) =>
          index === total - 1 && data.access === 'owner' ? (
            <WrappedExportControls
              data={data}
              userId={id}
              onPublicationChange={setData}
            />
          ) : null
        }
      />
      <WrappedManageSharing
        data={data}
        userId={id}
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onChange={setData}
      />
    </>
  );
}
