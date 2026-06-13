import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  resolveNotificationHref,
} from '@/lib/notifications';
import type { NotificationRecord } from '@/types/notifications';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    const isMore = Boolean(cursor);
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await fetchNotifications({ limit: 25, cursor });
      setItems((prev) => (isMore ? [...prev, ...data.notifications] : data.notifications));
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openItem(notification: NotificationRecord) {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );
    }
    const href = resolveNotificationHref(notification.linkUrl);
    if (!href) return;
    if (href.includes('/backup/download/')) {
      window.location.href = href;
      return;
    }
    navigate(href);
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Your in-app inbox across all campaigns.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void markAllNotificationsRead().then(() =>
              setItems((prev) => prev.map((item) => ({ ...item, isRead: true }))),
            );
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-elevated"
        >
          Mark all read
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-4">
              <button
                type="button"
                onClick={() => void openItem(item)}
                className={`min-w-0 flex-1 text-left ${item.isRead ? '' : 'font-medium'}`}
              >
                <p className="text-sm">{item.title}</p>
                {item.body ? <p className="mt-1 text-sm text-muted">{item.body}</p> : null}
                <p className="mt-2 text-xs text-muted">{formatWhen(item.createdAt)}</p>
              </button>
              <button
                type="button"
                onClick={() =>
                  void dismissNotification(item.id).then(() =>
                    setItems((prev) => prev.filter((row) => row.id !== item.id)),
                  )
                }
                className="shrink-0 text-xs text-muted hover:text-foreground"
              >
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}

      {nextCursor ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void load(nextCursor)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-elevated disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </PageContainer>
  );
}
