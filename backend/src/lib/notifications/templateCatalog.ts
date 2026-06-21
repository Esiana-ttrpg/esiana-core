import enNotifications from '../../../../frontend/src/i18n/en/profile/notifications.json' with { type: 'json' };
import {
  parseNotificationRenderMetadata,
  renderNotificationFromCatalog,
  type NotificationRenderMetadata,
} from '../../../../shared/notificationRender.js';
import { resolveEffectiveUiLocale } from '../../../../shared/uiLocale.js';
import type { NotificationTypeValue } from './types.js';

const catalogs = new Map<string, Record<string, string>>([
  ['en', enNotifications as Record<string, string>],
]);

function catalogForLanguage(languageTag: string): Record<string, string> {
  return catalogs.get(languageTag) ?? catalogs.get('en')!;
}

export function renderStoredNotification(
  type: NotificationTypeValue,
  metadata: unknown,
  fallback: { title: string; body?: string | null },
  locale: string,
): { title: string; body: string | null } {
  const languageTag = resolveEffectiveUiLocale({
    userUiLocale: locale,
    fallback: 'en',
  });
  const catalog = catalogForLanguage(languageTag);
  const renderMeta = parseNotificationRenderMetadata(metadata);
  return renderNotificationFromCatalog(type, renderMeta, catalog, fallback);
}

export function renderNotificationTemplate(
  type: NotificationTypeValue,
  renderMeta: NotificationRenderMetadata,
  locale = 'en',
): { title: string; body: string | null } {
  const languageTag = resolveEffectiveUiLocale({
    userUiLocale: locale,
    fallback: 'en',
  });
  const catalog = catalogForLanguage(languageTag);
  return renderNotificationFromCatalog(type, renderMeta, catalog, {
    title: '',
    body: null,
  });
}

export function englishNotificationCatalog(): Record<string, string> {
  return catalogForLanguage('en');
}
