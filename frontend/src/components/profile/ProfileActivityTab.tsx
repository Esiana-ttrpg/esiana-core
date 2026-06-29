import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UserActivityItem } from '@shared/statsTypes';
import { campaignDashboardPath } from '@/lib/campaignPaths';
import {
  fetchOwnerUserActivity,
  fetchPublicUserActivity,
} from '@/lib/statsApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';

interface ProfileActivityTabProps {
  userId: string;
  isSelf: boolean;
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function bucketLabel(
  createdAt: string,
  t: (key: string) => string,
  locale: string,
): string {
  const created = new Date(createdAt);
  const todayStart = startOfLocalDay(new Date());
  const dayStart = startOfLocalDay(created);
  if (dayStart === todayStart) return t('profile.activity.today');
  if (dayStart === todayStart - 24 * 60 * 60 * 1000) return t('profile.activity.yesterday');
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(created);
}

export function ProfileActivityTab({ userId, isSelf }: ProfileActivityTabProps) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<UserActivityItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const response = isSelf
        ? await fetchOwnerUserActivity({ limit: 20 })
        : await fetchPublicUserActivity(userId, { limit: 20 });
      setItems(response.items);
      setHasMore(response.hasMore);
    } catch {
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [isSelf, userId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = async () => {
    if (!hasMore || items.length === 0) return;
    const before = items[items.length - 1]?.createdAt;
    if (!before) return;
    setLoadingMore(true);
    try {
      const response = isSelf
        ? await fetchOwnerUserActivity({ limit: 20, before })
        : await fetchPublicUserActivity(userId, { limit: 20, before });
      setItems((prev) => [...prev, ...response.items]);
      setHasMore(response.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const grouped = useMemo(() => {
    const buckets = new Map<string, UserActivityItem[]>();
    for (const item of items) {
      const label = bucketLabel(item.createdAt, t, i18n.language);
      const list = buckets.get(label) ?? [];
      list.push(item);
      buckets.set(label, list);
    }
    return [...buckets.entries()];
  }, [items, t, i18n.language]);

  if (loading) {
    return <LoadingSpinner label="Loading activity…" />;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">{t('profile.activity.empty')}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{t('profile.activity.intro')}</p>
      {grouped.map(([label, bucketItems]) => (
        <section key={label} className="space-y-3">
          <h3 className={META_SECTION_LABEL_CLASS}>{label}</h3>
          <ul className="space-y-3">
            {bucketItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border/70 bg-surface px-4 py-3 text-sm"
              >
                <p className="text-foreground">
                  {item.href ? (
                    <Link to={item.href} className="text-primary hover:underline">
                      {item.line}
                    </Link>
                  ) : (
                    item.line
                  )}
                </p>
                {item.campaign ? (
                  <p className="mt-1 text-xs text-muted">
                    {t('profile.activity.in')}{' '}
                    <Link
                      to={campaignDashboardPath(item.campaign.handle)}
                      className="text-primary hover:underline"
                    >
                      {item.campaign.name}
                    </Link>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hasMore ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {loadingMore ? '…' : t('profile.activity.loadMore')}
        </button>
      ) : null}
    </div>
  );
}
