import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { WrappedFinalCardPreset, WrappedYearResponse } from '@shared/wrappedTypes';
import {
  fetchOwnerWrappedYear,
  publishOwnerWrappedYear,
} from '@/lib/statsApi';
import {
  canonicalWrappedUrl,
  downloadWrappedBlob,
  shareWrappedImageFile,
  shareWrappedLink,
} from '@/lib/wrappedShare';
import { WrappedFinalExportCard } from './WrappedFinalExportCard';
import {
  assertNoCampaignIdsInShareModel,
  buildShareSafeFinalCard,
  type ShareSafeFinalCardModel,
} from './shareSafeFields';
import { captureWrappedPng } from './exportWrappedPng';

const PRESETS: WrappedFinalCardPreset[] = [
  'adventurer',
  'worldbuilder',
  'storyteller',
];

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function WrappedExportControls({
  data,
  userId,
  onPublicationChange,
}: {
  data: WrappedYearResponse;
  userId: string;
  onPublicationChange?: (next: WrappedYearResponse) => void;
}) {
  const { t, i18n } = useTranslation();
  const [preset, setPreset] = useState<WrappedFinalCardPreset>('storyteller');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [exportModel, setExportModel] = useState<ShareSafeFinalCardModel>(() =>
    buildShareSafeFinalCard(data, 'storyteller'),
  );
  const exportHostRef = useRef<HTMLDivElement>(null);
  const shareDialogRef = useRef<HTMLDivElement>(null);
  const isOwner = data.access === 'owner';
  const published = data.publication.status === 'published';
  const canPublish = data.publication.publicPublishingEnabled;

  const previewModel = buildShareSafeFinalCard(data, preset);

  useEffect(() => {
    if (!shareOpen) return;
    const frame = requestAnimationFrame(() => {
      const root = shareDialogRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? root).focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [shareOpen, confirmPublish]);

  const captureFreshPng = async (): Promise<{ blob: Blob; year: number }> => {
    const fresh = await fetchOwnerWrappedYear(data.year);
    const model = buildShareSafeFinalCard(fresh, preset);
    assertNoCampaignIdsInShareModel(model);
    setExportModel(model);
    await waitForNextPaint();
    const node = exportHostRef.current?.querySelector(
      '[data-wrapped-export-root="true"]',
    ) as HTMLElement | null;
    if (!node) throw new Error('Export root missing');
    const blob = await captureWrappedPng(node);
    return { blob, year: fresh.year };
  };

  const runDownload = async () => {
    setBusy(true);
    setError(null);
    setManualUrl(null);
    try {
      const { blob, year } = await captureFreshPng();
      downloadWrappedBlob(blob, `esiana-wrapped-${year}.png`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('profile.wrapped.export.error'));
    } finally {
      setBusy(false);
    }
  };

  const runShareImage = async () => {
    setBusy(true);
    setError(null);
    setManualUrl(null);
    try {
      const { blob, year } = await captureFreshPng();
      const outcome = await shareWrappedImageFile({
        blob,
        year,
        title: t('profile.wrapped.title', { year }),
      });
      if (outcome === 'downloaded') {
        setError(t('profile.wrapped.share.downloadFallback'));
        return;
      }
      setShareOpen(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('profile.wrapped.export.error'));
    } finally {
      setBusy(false);
    }
  };

  const runShareLink = async (alreadyPublished: boolean) => {
    setBusy(true);
    setError(null);
    setManualUrl(null);
    try {
      if (!alreadyPublished) {
        if (!canPublish) {
          setError(t('profile.wrapped.share.publishingDisabled'));
          return;
        }
        const next = await publishOwnerWrappedYear(data.year);
        onPublicationChange?.(next);
        setConfirmPublish(false);
        setError(t('profile.wrapped.share.linkReady'));
        return;
      }
      const url = canonicalWrappedUrl(userId, data.year);
      const result = await shareWrappedLink({
        url,
        title: t('profile.wrapped.title', { year: data.year }),
      });
      if (result.outcome === 'manual') {
        setManualUrl(result.url);
        setError(t('profile.wrapped.share.manualLinkHelp'));
        return;
      }
      setShareOpen(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('profile.wrapped.share.linkError'));
    } finally {
      setBusy(false);
    }
  };

  if (!isOwner) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-md border px-3 py-1.5 text-sm ${
              preset === value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card'
            }`}
            onClick={() => setPreset(value)}
          >
            {t(`profile.wrapped.export.preset${value[0]!.toUpperCase()}${value.slice(1)}`)}
          </button>
        ))}
      </div>
      <WrappedFinalExportCard model={previewModel} t={t} locale={i18n.language} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          className="flex-1 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium hover:bg-primary/15 disabled:opacity-60"
          onClick={() => {
            setError(null);
            setManualUrl(null);
            setConfirmPublish(false);
            setShareOpen(true);
          }}
        >
          {t('profile.wrapped.export.share')}
        </button>
        <button
          type="button"
          disabled={busy}
          className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-60"
          onClick={() => void runDownload()}
        >
          {busy ? '…' : t('profile.wrapped.export.download')}
        </button>
      </div>
      {error && !shareOpen ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {shareOpen
        ? createPortal(
            <div
              ref={shareDialogRef}
              data-wrapped-sharing-dialog="true"
              tabIndex={-1}
              className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 outline-none sm:items-center"
              role="dialog"
              aria-modal="true"
              aria-label={t('profile.wrapped.share.dialogTitle')}
              onClick={() => !busy && setShareOpen(false)}
            >
              <div
                className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-base font-semibold">
                  {t('profile.wrapped.share.dialogTitle')}
                </h2>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
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
                {!confirmPublish ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/40 disabled:opacity-60"
                      onClick={() => void runShareImage()}
                    >
                      <span className="font-medium">
                        {t('profile.wrapped.share.asImage')}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {t('profile.wrapped.share.asImageHelp')}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={busy || !canPublish}
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/40 disabled:opacity-60"
                      onClick={() => {
                        if (published) {
                          void runShareLink(true);
                        } else {
                          setConfirmPublish(true);
                        }
                      }}
                    >
                      <span className="font-medium">
                        {t('profile.wrapped.share.asLink')}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {published
                          ? t('profile.wrapped.share.asLinkPublishedHelp')
                          : t('profile.wrapped.share.asLinkHelp')}
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground">
                      {t('profile.wrapped.share.publishConsent')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
                        onClick={() => setConfirmPublish(false)}
                      >
                        {t('profile.wrapped.share.cancel')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="flex-1 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium"
                        onClick={() => void runShareLink(false)}
                      >
                        {t('profile.wrapped.share.confirmPublish')}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => !busy && setShareOpen(false)}
                >
                  {t('profile.wrapped.close')}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {createPortal(
        <div
          ref={exportHostRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: -10000,
            top: 0,
            width: 1080,
            height: 1920,
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          <WrappedFinalExportCard
            model={exportModel}
            t={t}
            locale={i18n.language}
            exportMode
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
