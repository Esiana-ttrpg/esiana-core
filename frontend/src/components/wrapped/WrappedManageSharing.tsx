import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WrappedYearResponse } from '@shared/wrappedTypes';
import {
  publishOwnerWrappedYear,
  unpublishOwnerWrappedYear,
} from '@/lib/statsApi';
import { canonicalWrappedUrl } from '@/lib/wrappedShare';

export function WrappedManageSharing({
  data,
  userId,
  open,
  onClose,
  onChange,
}: {
  data: WrappedYearResponse;
  userId: string;
  open: boolean;
  onClose: () => void;
  onChange: (next: WrappedYearResponse) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const published = data.publication.status === 'published';
  const canPublish = data.publication.publicPublishingEnabled;
  const url = canonicalWrappedUrl(userId, data.year);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? root).focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, confirmPublish]);

  if (!open || data.access !== 'owner') return null;

  const copyLink = async () => {
    setBusy(true);
    setError(null);
    setManualUrl(null);
    try {
      if (!navigator.clipboard?.writeText) {
        setManualUrl(url);
        setError(t('profile.wrapped.share.manualLinkHelp'));
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      setManualUrl(url);
      setError(t('profile.wrapped.share.manualLinkHelp'));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    setManualUrl(null);
    try {
      const next = await publishOwnerWrappedYear(data.year);
      onChange(next);
      setConfirmPublish(false);
    } catch {
      setError(t('profile.wrapped.share.linkError'));
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    setError(null);
    setManualUrl(null);
    try {
      const next = await unpublishOwnerWrappedYear(data.year);
      onChange(next);
    } catch {
      setError(t('profile.wrapped.manage.unpublishError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      data-wrapped-sharing-dialog="true"
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 outline-none sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('profile.wrapped.manage.title')}
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{t('profile.wrapped.manage.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {published
            ? t('profile.wrapped.manage.statusPublished', {
                at: data.publication.publishedAt
                  ? new Date(data.publication.publishedAt).toLocaleString()
                  : '',
              })
            : t('profile.wrapped.manage.statusPrivate')}
        </p>
        {!canPublish ? (
          <p className="text-sm text-muted-foreground">
            {t('profile.wrapped.share.publishingDisabled')}
          </p>
        ) : null}

        {confirmPublish ? (
          <div className="space-y-3">
            <p className="text-sm">{t('profile.wrapped.share.publishConsent')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
                disabled={busy}
                onClick={() => setConfirmPublish(false)}
              >
                {t('profile.wrapped.share.cancel')}
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium"
                disabled={busy}
                onClick={() => void publish()}
              >
                {t('profile.wrapped.share.confirmPublish')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {published ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40"
                  onClick={() => void copyLink()}
                >
                  {t('profile.wrapped.manage.copyLink')}
                </button>
                <button
                  type="button"
                  disabled={busy || !canPublish}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40 disabled:opacity-60"
                  onClick={() => {
                    setConfirmPublish(true);
                  }}
                >
                  {t('profile.wrapped.manage.republish')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="w-full rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  onClick={() => void unpublish()}
                >
                  {t('profile.wrapped.manage.unpublish')}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy || !canPublish}
                className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40 disabled:opacity-60"
                onClick={() => setConfirmPublish(true)}
              >
                {t('profile.wrapped.manage.publish')}
              </button>
            )}
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {manualUrl ? (
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">
              {t('profile.wrapped.share.manualLinkLabel')}
            </span>
            <input
              type="text"
              readOnly
              value={manualUrl}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
        ) : null}
        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => !busy && onClose()}
        >
          {t('profile.wrapped.close')}
        </button>
      </div>
    </div>
  );
}
