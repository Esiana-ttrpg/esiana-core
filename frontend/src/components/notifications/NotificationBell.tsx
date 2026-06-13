import { Bell, CheckCheck, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  dismissNotification,
  fetchNotificationCapabilities,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  resolveNotificationHref,
} from '@/lib/notifications';
import type { NotificationRecord } from '@/types/notifications';

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

export function NotificationBell({
  alignControlsToAvatar = false,
}: {
  alignControlsToAvatar?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [pollMs, setPollMs] = useState(60_000);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const refreshCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // ignore transient errors
    }
  }, [isAuthenticated]);

  const refreshPreview = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await fetchNotifications({ limit: 8 });
      setItems(data.notifications);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCount(), refreshPreview()]);
  }, [refreshCount, refreshPreview]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchNotificationCapabilities()
      .then((caps) => setPollMs(Math.max(30, caps.pollIntervalSeconds) * 1000))
      .catch(() => setPollMs(60_000));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshAll();

    const onFocus = () => {
      if (!document.hidden) void refreshAll();
    };
    const onVisibility = () => {
      if (!document.hidden) void refreshAll();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, refreshAll]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const tick = () => {
      if (!document.hidden) void refreshCount();
    };
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [isAuthenticated, pollMs, refreshCount]);

  useEffect(() => {
    if (!open) return;
    void refreshPreview();
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open, refreshPreview]);

  async function handleOpenItem(notification: NotificationRecord) {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      setUnreadCount((value) => Math.max(0, value - 1));
    }
    setOpen(false);
    const href = resolveNotificationHref(notification.linkUrl);
    if (!href) return;
    if (href.includes('/backup/download/')) {
      window.location.href = href;
      return;
    }
    navigate(href);
  }

  async function handleDismiss(id: string, event: React.MouseEvent) {
    event.stopPropagation();
    await dismissNotification(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    void refreshCount();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
  }

  if (!isAuthenticated) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={
          alignControlsToAvatar
            ? 'relative inline-flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-[rgb(var(--color-focal-rgb)/0.06)]'
            : 'relative inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-elevated'
        }
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className={alignControlsToAvatar ? 'size-4' : 'size-5'} />
        {unreadCount > 0 ? (
          <span
            className={`absolute inline-flex items-center justify-center rounded-full bg-primary font-bold text-background ${
              alignControlsToAvatar
                ? '-right-0.5 -top-0.5 min-w-[0.9rem] px-0.5 text-[9px]'
                : '-right-1 -top-1 min-w-[1.1rem] px-1 text-[10px]'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No notifications yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleOpenItem(item)}
                  className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-elevated ${
                    item.isRead ? 'opacity-80' : 'bg-elevated/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.body}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => void handleDismiss(item.id, event)}
                    className="shrink-0 rounded p-1 text-muted hover:bg-background hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="size-3.5" />
                  </button>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border px-4 py-2">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
