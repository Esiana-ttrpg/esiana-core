import { getActiveUiLanguage, i18n, initI18n } from '@/i18n/initI18n';

initI18n();

function activeLocale(): string {
  return getActiveUiLanguage();
}

export function formatCreatedDate(iso: string | undefined, locale?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale ?? activeLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatRelativeUpdated(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return i18n.t('common.justNow');

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return i18n.t('common.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t('common.hoursAgo', { count: hours });

  const days = Math.floor(hours / 24);
  if (days < 7) return i18n.t('common.daysAgo', { count: days });

  return formatCreatedDate(iso);
}

export function formatLastOpened(iso: string | undefined): string {
  const relative = formatRelativeUpdated(iso);
  if (!iso || relative === '—') return '';
  return i18n.t('navigation.account.lastOpened', { when: relative });
}

export function formatFaintRecency(iso: string | undefined): string {
  const relative = formatRelativeUpdated(iso);
  if (!iso || relative === '—') return '';
  return relative;
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function formatAbsoluteDateTime(iso: string | undefined, locale?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale ?? activeLocale());
}
