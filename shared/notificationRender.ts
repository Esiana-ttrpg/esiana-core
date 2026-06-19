import type { NotificationTypeValue } from './notificationTypes.js';

export const NOTIFICATION_RENDER_VERSION = 1 as const;

export type NotificationTemplateVariant =
  | 'default'
  | 'gamemasterPromotion'
  | 'removed'
  | 'left'
  | 'reason'
  | 'customBody'
  | 'withStartTime'
  | 'withoutStartTime'
  | 'import'
  | 'restore'
  | 'inviteJoin';

export type NotificationTemplateVars = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface NotificationRenderMetadata {
  renderVersion: typeof NOTIFICATION_RENDER_VERSION;
  variant?: NotificationTemplateVariant | null;
  vars: NotificationTemplateVars;
}

export interface NotificationTemplateKeys {
  titleKey: string;
  bodyKey?: string | null;
}

const TPL = 'profile.notifications';

function namedSuffix(value: unknown): 'Named' | '' {
  return typeof value === 'string' && value.trim() ? 'Named' : '';
}

export function interpolateNotificationTemplate(
  template: string,
  vars: NotificationTemplateVars,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

export function parseNotificationRenderMetadata(
  metadata: unknown,
): NotificationRenderMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const row = metadata as Record<string, unknown>;
  if (row.renderVersion !== NOTIFICATION_RENDER_VERSION) return null;
  if (!row.vars || typeof row.vars !== 'object' || Array.isArray(row.vars)) {
    return null;
  }
  const variant = row.variant;
  return {
    renderVersion: NOTIFICATION_RENDER_VERSION,
    variant:
      typeof variant === 'string'
        ? (variant as NotificationTemplateVariant)
        : null,
    vars: row.vars as NotificationTemplateVars,
  };
}

export function buildNotificationRenderMetadata(input: {
  variant?: NotificationTemplateVariant | null;
  vars: NotificationTemplateVars;
}): NotificationRenderMetadata {
  return {
    renderVersion: NOTIFICATION_RENDER_VERSION,
    variant: input.variant ?? null,
    vars: input.vars,
  };
}

/** Resolve i18n keys for a notification type + variant + vars. */
export function resolveNotificationTemplateKeys(
  type: NotificationTypeValue,
  variant: NotificationTemplateVariant | null | undefined,
  vars: NotificationTemplateVars,
): NotificationTemplateKeys | null {
  const resolvedVariant = variant ?? 'default';

  switch (type) {
    case 'JOIN_REQUEST_ACCEPTED':
      return {
        titleKey: `${TPL}.tplJoinRequestAcceptedTitle${namedSuffix(vars.campaignName)}`,
        bodyKey: `${TPL}.tplJoinRequestAcceptedBody`,
      };
    case 'JOIN_REQUEST_DENIED':
      return {
        titleKey: `${TPL}.tplJoinRequestDeniedTitle${namedSuffix(vars.campaignName)}`,
        bodyKey:
          resolvedVariant === 'customBody'
            ? null
            : resolvedVariant === 'reason'
              ? `${TPL}.tplJoinRequestDeniedBodyReason`
              : `${TPL}.tplJoinRequestDeniedBodyDefault`,
      };
    case 'JOIN_REQUEST_RECEIVED':
      return {
        titleKey: `${TPL}.tplJoinRequestReceivedTitle${namedSuffix(vars.campaignName)}`,
        bodyKey: `${TPL}.tplJoinRequestReceivedBody`,
      };
    case 'ROLE_CHANGED':
      if (resolvedVariant === 'gamemasterPromotion') {
        return {
          titleKey: `${TPL}.tplRoleChangedGamemasterTitle`,
          bodyKey: `${TPL}.tplRoleChangedGamemasterBody`,
        };
      }
      return {
        titleKey: `${TPL}.tplRoleChangedTitle`,
        bodyKey: `${TPL}.tplRoleChangedBody`,
      };
    case 'OWNERSHIP_TRANSFER_OFFERED':
      return {
        titleKey: `${TPL}.tplOwnershipTransferOfferedTitle`,
        bodyKey: `${TPL}.tplOwnershipTransferOfferedBody`,
      };
    case 'OWNERSHIP_TRANSFER_COMPLETED':
      return {
        titleKey: `${TPL}.tplOwnershipTransferCompletedTitle`,
        bodyKey: `${TPL}.tplOwnershipTransferCompletedBody`,
      };
    case 'OWNERSHIP_TRANSFER_DECLINED':
      return {
        titleKey: `${TPL}.tplOwnershipTransferDeclinedTitle`,
        bodyKey: `${TPL}.tplOwnershipTransferDeclinedBody`,
      };
    case 'OWNERSHIP_TRANSFER_EXPIRED':
      return {
        titleKey: `${TPL}.tplOwnershipTransferExpiredTitle`,
        bodyKey: `${TPL}.tplOwnershipTransferExpiredBody`,
      };
    case 'MEMBER_DEPARTED':
      return {
        titleKey: `${TPL}.tplMemberDepartedTitle`,
        bodyKey:
          resolvedVariant === 'removed'
            ? `${TPL}.tplMemberDepartedBodyRemoved`
            : `${TPL}.tplMemberDepartedBodyLeft`,
      };
    case 'SESSION_PUBLISHED':
      return {
        titleKey: `${TPL}.tplSessionPublishedTitle`,
        bodyKey:
          resolvedVariant === 'withStartTime'
            ? `${TPL}.tplSessionPublishedBodyWithStart`
            : `${TPL}.tplSessionPublishedBodyDefault`,
      };
    case 'SESSION_CHANGED':
      return {
        titleKey: `${TPL}.tplSessionChangedTitle`,
        bodyKey: `${TPL}.tplSessionChangedBody`,
      };
    case 'SESSION_CANCELLED':
      return {
        titleKey: `${TPL}.tplSessionCancelledTitle`,
        bodyKey: `${TPL}.tplSessionCancelledBody`,
      };
    case 'SESSION_REMINDER_24H':
      return {
        titleKey: `${TPL}.tplSessionReminderTitle`,
        bodyKey:
          resolvedVariant === 'withStartTime'
            ? `${TPL}.tplSessionReminderBodyWithStart`
            : `${TPL}.tplSessionReminderBodyDefault`,
      };
    case 'RSVP_UPDATED':
      return {
        titleKey: `${TPL}.tplRsvpUpdatedTitle`,
        bodyKey: `${TPL}.tplRsvpUpdatedBody`,
      };
    case 'EXPORT_READY':
      return {
        titleKey: `${TPL}.tplExportReadyTitle`,
        bodyKey: `${TPL}.tplExportReadyBody`,
      };
    case 'EXPORT_FAILED':
      return {
        titleKey: `${TPL}.tplExportFailedTitle`,
        bodyKey: null,
      };
    case 'IMPORT_COMPLETE':
      return {
        titleKey:
          resolvedVariant === 'restore'
            ? `${TPL}.tplImportCompleteTitleRestore`
            : `${TPL}.tplImportCompleteTitleImport`,
        bodyKey:
          resolvedVariant === 'restore'
            ? `${TPL}.tplImportCompleteBodyRestore`
            : `${TPL}.tplImportCompleteBodyImport`,
      };
    case 'IMPORT_FAILED':
      return {
        titleKey:
          resolvedVariant === 'restore'
            ? `${TPL}.tplImportFailedTitleRestore${namedSuffix(vars.campaignName)}`
            : `${TPL}.tplImportFailedTitleImport${namedSuffix(vars.campaignName)}`,
        bodyKey: null,
      };
    case 'GENERIC':
      if (resolvedVariant === 'inviteJoin') {
        return {
          titleKey: `${TPL}.tplGenericInviteJoinTitle${namedSuffix(vars.campaignName)}`,
          bodyKey: `${TPL}.tplGenericInviteJoinBody`,
        };
      }
      return null;
    case 'MENTION_IN_PAGE':
      return {
        titleKey: `${TPL}.tplMentionInPageTitle`,
        bodyKey: `${TPL}.tplMentionInPageBody`,
      };
    case 'CHARACTER_REFERENCED_IN_PAGE':
      return {
        titleKey: `${TPL}.tplCharacterReferencedTitle`,
        bodyKey: `${TPL}.tplCharacterReferencedBody`,
      };
    default:
      return null;
  }
}

export function renderNotificationFromCatalog(
  type: NotificationTypeValue,
  metadata: NotificationRenderMetadata | null,
  catalog: Record<string, string>,
  fallback: { title: string; body?: string | null },
): { title: string; body: string | null } {
  if (!metadata) {
    return { title: fallback.title, body: fallback.body ?? null };
  }

  const keys = resolveNotificationTemplateKeys(
    type,
    metadata.variant,
    metadata.vars,
  );
  if (!keys) {
    return { title: fallback.title, body: fallback.body ?? null };
  }

  const titleTemplate = catalog[keys.titleKey];
  const title = titleTemplate
    ? interpolateNotificationTemplate(titleTemplate, metadata.vars)
    : fallback.title;

  if (keys.bodyKey === null) {
    const customBody = metadata.vars.customBody;
    if (typeof customBody === 'string' && customBody.trim()) {
      return { title, body: customBody };
    }
    return { title, body: fallback.body ?? null };
  }

  const bodyTemplate = keys.bodyKey ? catalog[keys.bodyKey] : undefined;
  const body = bodyTemplate
    ? interpolateNotificationTemplate(bodyTemplate, metadata.vars)
    : (fallback.body ?? null);

  return { title, body };
}
