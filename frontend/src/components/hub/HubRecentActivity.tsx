import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  Download,
  UserPlus,
  Users,
} from 'lucide-react';
import { fetchNotifications } from '@/lib/notifications';
import type { NotificationRecord, NotificationType } from '@/types/notifications';
import type { HubRecentActivityItem } from '@/types/hub';
import { PagePanel } from '@/components/layout/PageContainer';

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'SESSION_PUBLISHED':
    case 'SESSION_CHANGED':
    case 'SESSION_CANCELLED':
    case 'SESSION_REMINDER_24H':
      return CalendarClock;
    case 'JOIN_REQUEST_RECEIVED':
    case 'JOIN_REQUEST_ACCEPTED':
    case 'JOIN_REQUEST_DENIED':
      return UserPlus;
    case 'ROLE_CHANGED':
    case 'MEMBER_DEPARTED':
      return Users;
    case 'EXPORT_READY':
    case 'IMPORT_COMPLETE':
      return Download;
    default:
      return Bell;
  }
}

interface HubRecentActivityProps {
  /** When provided (Phase 2 hub), skip fetch and use server data. */
  items?: HubRecentActivityItem[];
  loading?: boolean;
}

export function HubRecentActivity({ items: externalItems, loading: externalLoading }: HubRecentActivityProps) {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(externalItems == null);

  useEffect(() => {
    if (externalItems != null) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchNotifications({ limit: 8 });
        if (!cancelled) setItems(data.notifications);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [externalItems]);

  const displayItems: Array<{
    id: string;
    title: string;
    createdAt: string;
    linkUrl: string | null;
    type: NotificationType;
  }> =
    externalItems != null
      ? externalItems.map((item) => ({
          id: item.id,
          title: item.title,
          createdAt: item.createdAt,
          linkUrl: item.linkUrl,
          type: item.type,
        }))
      : items;

  const isLoading = externalLoading ?? loading;

  return (
    <PagePanel className="flex h-full flex-col rounded-2xl p-5">
      <h2 className={TYPE_DISPLAY_CLASS}>Recent Activity</h2>
      <div className="mt-4 flex-1">
        {isLoading ? (
          <p className="text-sm text-muted">Loading activity…</p>
        ) : displayItems.length === 0 ? (
          <p className="text-sm text-muted">
            Your tables are quiet — lore edits and session updates will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {displayItems.map((item) => {
              const Icon = notificationIcon(item.type);
              const content = (
                <>
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary/80" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </>
              );
              return (
                <li key={item.id}>
                  {item.linkUrl ? (
                    <Link
                      to={item.linkUrl}
                      className="flex gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-elevated/80"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex gap-2 px-1 py-0.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <Link
          to="/notifications"
          className="text-xs font-medium text-primary hover:text-primary-hover"
        >
          View all notifications →
        </Link>
      </div>
    </PagePanel>
  );
}
