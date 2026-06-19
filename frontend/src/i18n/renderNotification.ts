import {
  parseNotificationRenderMetadata,
  renderNotificationFromCatalog,
} from '../../../shared/notificationRender';
import type { NotificationType } from '@/types/notifications';
import { i18n } from '@/i18n/initI18n';

function activeTranslationCatalog(): Record<string, string> {
  const language = i18n.language || 'en';
  const bundle = i18n.getResourceBundle(language, 'translation');
  return (bundle ?? {}) as Record<string, string>;
}

export function renderNotificationContent(input: {
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
}): { title: string; body: string | null } {
  const renderMeta = parseNotificationRenderMetadata(input.metadata);
  return renderNotificationFromCatalog(
    input.type,
    renderMeta,
    activeTranslationCatalog(),
    { title: input.title, body: input.body },
  );
}
