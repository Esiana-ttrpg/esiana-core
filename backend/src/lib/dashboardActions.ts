import { canManageLedgerSettings } from './campaignLedgerService.js';
import { prisma } from './prisma.js';
import type { CampaignContext } from '../types/api.js';
import type { DashboardSummary } from './buildDashboardSummary.js';
import type { DashboardAction } from '../../../shared/dashboardCampaignFeatures.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { dashboardVisiblePages } from './dashboardContent.js';

/** Only durable outstanding states are actions. Session-note contributions are optional. */
export async function dashboardActions(ctx: CampaignContext, userId: string | undefined, summary: DashboardSummary): Promise<DashboardAction[]> {
  if (!ctx.isMember || !userId) return [];
  const base = `/campaigns/${encodeURIComponent(ctx.campaignHandle ?? ctx.campaignId)}`;
  const items: DashboardAction[] = [];
  const next = summary.nextSession;
  if (next?.plannedStartAt && Date.parse(next.plannedStartAt) > Date.now()) {
    const response = await prisma.sessionAttendance.findUnique({ where: { timelinePointId_userId: { timelinePointId: next.timelinePointId, userId } }, select: { status: true } });
    if (!response) items.push({ id: `rsvp:${next.timelinePointId}`, title: 'Respond to the next session', context: next.title,
      href: `${base}/notes/${encodeURIComponent(next.timelinePointId)}`, optional: false, deadline: next.plannedStartAt });
  }
  if (ctx.capabilities.has(C.CAMPAIGN_MANAGE_ROLES) && ctx.capabilities.has(C.CAMPAIGN_SETTINGS_EDIT)) {
    const pending = await prisma.campaignJoinRequest.findFirst({ where: { campaignId: ctx.campaignId, status: 'PENDING' }, select: { id: true } });
    if (pending) items.push({ id: `membership:${pending.id}`, title: 'Review a pending membership request', context: 'A request is waiting for a decision.', href: `${base}/settings?tab=recruitment`, optional: false, deadline: null });
  }
  // Ledger suggestions have a durable pending -> accepted/rejected lifecycle.
  // Planned projects and open threads are not treated as outstanding decisions.
  if (ctx.capabilities.has(C.DOWNTIME_MANAGE) && ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW) && canManageLedgerSettings(ctx.role)) {
    const pending = await prisma.campaignLedgerSuggestion.findMany({ where: { campaignId: ctx.campaignId, status: 'pending' }, select: { id: true, havenWikiPageId: true, project: { select: { wikiPageId: true } } }, orderBy: { createdAt: 'asc' }, take: 10 });
    const ids = pending.flatMap(row => [row.project?.wikiPageId, row.havenWikiPageId].filter((id): id is string => !!id));
    const visible = new Set((await dashboardVisiblePages(ctx, ids)).map(page => page.id));
    for (const row of pending) if ((!row.project || visible.has(row.project.wikiPageId)) && (!row.havenWikiPageId || visible.has(row.havenWikiPageId))) items.push({ id: `downtime:${row.id}`, title: 'Review a pending downtime ledger suggestion',
      context: 'Accept or dismiss the recorded suggestion.', href: `${base}/downtime?section=ledger`, optional: false, deadline: null });
  }
  const followUp = summary.lastSession?.followUp;
  if (followUp?.media?.transcript.state === 'failed') items.push({ id: `transcript:${summary.lastSession!.timelinePointId}`, title: 'Review transcript processing', context: 'Authorized processing requires attention.', href: followUp.media.transcript.href ?? followUp.notesHref, optional: false, deadline: null });
  if (followUp?.myNotes.state === 'not_added' && followUp.myNotes.href && followUp.myNotes.canEdit) items.push({ id: `notes:${summary.lastSession!.timelinePointId}`, title: 'Add your session notes', context: 'Optional contribution to the campaign record.', href: followUp.myNotes.href, optional: true, deadline: null });
  return items.sort((a, b) => Number(a.optional) - Number(b.optional) || (a.deadline ? Date.parse(a.deadline) : Infinity) - (b.deadline ? Date.parse(b.deadline) : Infinity)).slice(0, 6);
}
