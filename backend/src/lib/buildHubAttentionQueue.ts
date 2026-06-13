import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import {
  campaignDashboardPath,
  campaignDowntimeHubPath,
  campaignProgressionDevelopmentsPath,
  campaignNotePath,
  campaignSettingsPath,
  campaignThreadsHubPath,
  campaignWikiMaintenancePath,
  userNotificationsPath,
} from './notifications/deepLinks.js';
import type { HubCampaignBatchSignals } from './buildHubBatchSignals.js';
import type { HubCampaignSignals } from './buildHubContinueRanking.js';

export type HubAttentionSeverity = 'elevated' | 'soft' | 'whisper';

export type HubAttentionKind =
  | 'MISSING_RECAP'
  | 'STALE_SESSION'
  | 'RSVP'
  | 'JOIN_REQUEST'
  | 'OPEN_THREADS'
  | 'UNRESOLVED_WIKILINKS'
  | 'DOWNTIME_PENDING'
  | 'UNREAD'
  | 'HAVEN_ESCALATION';

export type HubAttentionItem = {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  severity: HubAttentionSeverity;
  label: string;
  href: string;
  kind: HubAttentionKind;
  entityTitle?: string;
  dismissKey?: string;
};

export type HubUpcomingChip = {
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  title: string;
  plannedStartAt: string;
  href: string;
  needsRsvp: boolean;
};

type CampaignAttentionContext = {
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  role: CampaignMemberRole;
  baseSignals: HubCampaignSignals;
  batch: HubCampaignBatchSignals;
};

function isDmRole(role: CampaignMemberRole): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

export function buildAttentionItemsForCampaign(ctx: CampaignAttentionContext): HubAttentionItem[] {
  const items: HubAttentionItem[] = [];
  const { baseSignals, batch } = ctx;

  const rsvp = baseSignals.pendingActions.find((a) => a.type === 'RSVP');
  if (rsvp) {
    items.push({
      id: `${ctx.campaignId}:rsvp`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'elevated',
      label: `RSVP for ${baseSignals.nextSession?.title ?? 'upcoming session'}`,
      href: rsvp.href,
      kind: 'RSVP',
      entityTitle: baseSignals.nextSession?.title,
    });
  }

  const joinReq = baseSignals.pendingActions.find((a) => a.type === 'JOIN_REQUEST');
  if (joinReq) {
    items.push({
      id: `${ctx.campaignId}:join`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'elevated',
      label: 'A player is waiting to join your table',
      href: joinReq.href,
      kind: 'JOIN_REQUEST',
    });
  }

  if (batch.attentionCounts.missingRecap && batch.lastSession) {
    items.push({
      id: `${ctx.campaignId}:recap`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'elevated',
      label: `${batch.lastSession.title} needs a recap`,
      href: campaignNotePath(ctx.campaignHandle, batch.lastSession.timelinePointId),
      kind: 'MISSING_RECAP',
      entityTitle: batch.lastSession.title,
    });
  }

  const nextAt = baseSignals.nextSession?.plannedStartAt;
  if (nextAt && hoursUntil(nextAt) <= 24 && hoursUntil(nextAt) >= -12 && !rsvp) {
    items.push({
      id: `${ctx.campaignId}:session-soon`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'elevated',
      label: `Session soon: ${baseSignals.nextSession?.title ?? 'upcoming'}`,
      href: campaignNotePath(
        ctx.campaignHandle,
        baseSignals.nextSession!.timelinePointId,
      ),
      kind: 'RSVP',
      entityTitle: baseSignals.nextSession?.title,
    });
  }

  const days = batch.momentum.daysSinceLastSession;
  if (days != null && days > 21) {
    items.push({
      id: `${ctx.campaignId}:stale`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'soft',
      label: `Last played ${days} days ago`,
      href: campaignDashboardPath(ctx.campaignHandle),
      kind: 'STALE_SESSION',
    });
  }

  const openThreadsHref =
    batch.topThreadHref ?? campaignThreadsHubPath(ctx.campaignHandle);

  if (batch.attentionCounts.openThreads > 0 && batch.topThreadTitle) {
    items.push({
      id: `${ctx.campaignId}:thread`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'soft',
      label: `The ${batch.topThreadTitle} thread remains open`,
      href: openThreadsHref,
      kind: 'OPEN_THREADS',
      entityTitle: batch.topThreadTitle,
    });
  } else if (batch.attentionCounts.openThreads > 0) {
    items.push({
      id: `${ctx.campaignId}:threads`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'soft',
      label: 'Unresolved threads await your table',
      href: openThreadsHref,
      kind: 'OPEN_THREADS',
    });
  }

  if (batch.attentionCounts.pendingDowntime > 0) {
    items.push({
      id: `${ctx.campaignId}:downtime`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'soft',
      label: 'Pending developments await review',
      href: campaignProgressionDevelopmentsPath(ctx.campaignHandle),
      kind: 'DOWNTIME_PENDING',
    });
  }

  if (baseSignals.unreadCount > 0) {
    items.push({
      id: `${ctx.campaignId}:unread`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'soft',
      label:
        baseSignals.unreadCount === 1
          ? 'One unread update'
          : `${baseSignals.unreadCount} unread updates`,
      href: userNotificationsPath(),
      kind: 'UNREAD',
    });
  }

  if (isDmRole(ctx.role) && batch.attentionCounts.unresolvedWikilinks > 0) {
    items.push({
      id: `${ctx.campaignId}:wikilinks`,
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      severity: 'whisper',
      label: 'Unlinked references detected',
      href: campaignWikiMaintenancePath(ctx.campaignHandle),
      kind: 'UNRESOLVED_WIKILINKS',
      dismissKey: `wikilinks:${ctx.campaignId}`,
    });
  }

  return items;
}

const SEVERITY_ORDER: Record<HubAttentionSeverity, number> = {
  elevated: 0,
  soft: 1,
  whisper: 2,
};

export function buildHubAttentionQueue(input: {
  contexts: CampaignAttentionContext[];
  dismissedKeys: Set<string>;
}): HubAttentionItem[] {
  const all: HubAttentionItem[] = [];
  for (const ctx of input.contexts) {
    for (const item of buildAttentionItemsForCampaign(ctx)) {
      if (item.dismissKey && input.dismissedKeys.has(item.dismissKey)) continue;
      all.push(item);
    }
  }

  all.sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    return a.campaignName.localeCompare(b.campaignName);
  });

  return all.slice(0, 12);
}

export function buildUpcomingChips(input: {
  contexts: Array<{
    campaignId: string;
    campaignName: string;
    campaignHandle: string;
    nextSession: HubCampaignSignals['nextSession'];
    needsRsvp: boolean;
  }>;
}): HubUpcomingChip[] {
  const weekMs = 7 * 24 * 3_600_000;
  const now = Date.now();
  const chips: HubUpcomingChip[] = [];

  for (const ctx of input.contexts) {
    const session = ctx.nextSession;
    if (!session?.plannedStartAt) continue;
    const at = new Date(session.plannedStartAt).getTime();
    if (at < now - 12 * 3_600_000 || at > now + weekMs) continue;
    chips.push({
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignHandle: ctx.campaignHandle,
      title: session.title,
      plannedStartAt: session.plannedStartAt,
      href: campaignNotePath(ctx.campaignHandle, session.timelinePointId),
      needsRsvp: ctx.needsRsvp,
    });
  }

  chips.sort((a, b) => a.plannedStartAt.localeCompare(b.plannedStartAt));
  return chips;
}
