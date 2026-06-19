import {
  buildNotificationRenderMetadata,
  type NotificationTemplateVariant,
  type NotificationTemplateVars,
} from '../../../../shared/notificationRender.js';
import type { NotifyUsersInput } from './notificationService.js';
import { renderNotificationTemplate } from './templateCatalog.js';
import type { NotificationTypeValue } from './types.js';

export interface NotifyFromTemplateInput {
  userIds: string[];
  type: NotificationTypeValue;
  variant?: NotificationTemplateVariant | null;
  vars: NotificationTemplateVars;
  linkUrl?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresAt?: Date | null;
}

export function buildNotifyUsersInput(input: NotifyFromTemplateInput): NotifyUsersInput {
  const renderMeta = buildNotificationRenderMetadata({
    variant: input.variant,
    vars: input.vars,
  });
  const english = renderNotificationTemplate(input.type, renderMeta, 'en');
  return {
    userIds: input.userIds,
    type: input.type,
    title: english.title,
    body: english.body,
    linkUrl: input.linkUrl ?? null,
    campaignId: input.campaignId ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      ...renderMeta,
    },
    expiresAt: input.expiresAt ?? null,
  };
}

export function notifyFromTemplate(input: NotifyFromTemplateInput): NotifyUsersInput {
  return buildNotifyUsersInput(input);
}
