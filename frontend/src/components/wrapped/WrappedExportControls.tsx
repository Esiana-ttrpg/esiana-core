import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { WrappedFinalCardPreset, WrappedYearResponse } from '@shared/wrappedTypes';
import { fetchOwnerWrappedYear } from '@/lib/statsApi';
import { WrappedFinalExportCard } from './WrappedFinalExportCard';
import {
  assertNoCampaignIdsInShareModel,
  buildShareSafeFinalCard,
  type ShareSafeFinalCardModel,
} from './shareSafeFields';
import { captureWrappedPng, shareOrDownloadWrappedPng } from './exportWrappedPng';

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

export function WrappedExportControls({ data }: { data: WrappedYearResponse }) {
  const { t, i18n } = useTranslation();
  const [preset, setPreset] = useState<WrappedFinalCardPreset>('storyteller');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportModel, setExportModel] = useState<ShareSafeFinalCardModel>(() =>
    buildShareSafeFinalCard(data, 'storyteller'),
  );
  const exportHostRef = useRef<HTMLDivElement>(null);

  const previewModel = buildShareSafeFinalCard(data, preset);

  const runExport = async () => {
    setBusy(true);
    setError(null);
    try {
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
      await shareOrDownloadWrappedPng({
        blob,
        year: fresh.year,
        title: t('profile.wrapped.title', { year: fresh.year }),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setBusy(false);
        return;
      }
      setError(t('profile.wrapped.export.error'));
    } finally {
      setBusy(false);
    }
  };

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
      <button
        type="button"
        disabled={busy}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-60"
        onClick={() => void runExport()}
      >
        {busy ? '…' : t('profile.wrapped.export.share')}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

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
