import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { WrappedYearResponse } from '@shared/wrappedTypes';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  WRAPPED_VISUALIZATION_REGISTRY,
  type WrappedSlideProps,
} from './WrappedSlideVisualizations';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function WrappedStoryViewer({
  data,
  backHref,
  footer,
}: {
  data: WrappedYearResponse;
  backHref: string;
  footer?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const prefersReduced = usePrefersReducedMotion();
  const [pauseMotion, setPauseMotion] = useState(false);
  const reducedMotion = prefersReduced || pauseMotion;
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(true);

  const slides = data.slideManifest;
  const total = slides.length;
  const current = slides[index];

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(total - 1, next)));
    },
    [total],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(index - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        go(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        go(total - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, total]);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const slideProps: WrappedSlideProps = useMemo(
    () => ({
      data,
      t,
      locale: i18n.language,
      reducedMotion,
    }),
    [data, t, i18n.language, reducedMotion],
  );

  const Visualization = current
    ? WRAPPED_VISUALIZATION_REGISTRY[current.visualization]
    : undefined;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('profile.wrapped.title', { year: data.year })}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm outline-none"
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start == null || end == null) return;
        const delta = end - start;
        if (Math.abs(delta) < 48) return;
        if (delta < 0) go(index + 1);
        else go(index - 1);
      }}
    >
      <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-border bg-card shadow-xl sm:h-[min(92dvh,860px)] sm:max-w-[420px] sm:rounded-2xl sm:border">
        <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          <Link
            to={backHref}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t('profile.wrapped.close')}
          </Link>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {t('profile.wrapped.progress', {
              current: index + 1,
              total,
            })}
          </p>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setPauseMotion((v) => !v)}
          >
            {pauseMotion
              ? t('profile.wrapped.resumeMotion')
              : t('profile.wrapped.pauseMotion')}
          </button>
        </header>

        <div
          className="mx-4 mb-3 flex gap-1"
          role="tablist"
          aria-label={t('profile.wrapped.slideCounter', {
            current: index + 1,
            total,
          })}
        >
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t(slide.narrativeKey)}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{
                background:
                  i <= index
                    ? 'var(--stats-writing)'
                    : 'color-mix(in oklab, var(--color-border) 80%, transparent)',
              }}
              onClick={() => go(i)}
            />
          ))}
        </div>

        <div className="relative min-h-0 flex-1">
          <button
            type="button"
            className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize bg-transparent"
            aria-label={t('profile.wrapped.prev')}
            onClick={() => go(index - 1)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-e-resize bg-transparent"
            aria-label={t('profile.wrapped.next')}
            onClick={() => go(index + 1)}
          />
          <article
            className="relative z-0 h-full overflow-y-auto"
            aria-label={current ? t(current.narrativeKey) : undefined}
            style={{
              transition: reducedMotion ? undefined : 'opacity 200ms ease',
            }}
          >
            {Visualization ? Visualization(slideProps) : null}
          </article>
        </div>

        {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
