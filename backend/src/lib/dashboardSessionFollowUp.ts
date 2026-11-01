import { prisma } from './prisma.js';
import type { CampaignContext } from '../types/api.js';
import type { DashboardLastSessionSummary } from './buildDashboardSessions.js';
import type { DashboardSessionFollowUp } from '../../../shared/dashboardSessions.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { canReadRecording } from '../../../shared/processingPolicy.js';
import { ContentPresenceEntityType as E, ContentRevelationStates, type ContentRevelationState } from '../../../shared/contentPresence.js';
import { buildRevelationViewerContext, isPresenceVisibleToContext } from '../../../shared/narrativeProjection.js';
import { getContentPresenceStateMap, getContentPresenceStateBySubEntityMap } from './contentPresenceService.js';
import { fetchAuthorPagesForSession } from './sessionNotesCombined.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import { collectMarkdownFromBlocks } from './wikiExcerpt.js';
import { mapMemberToIdentityFields } from './memberIdentity.js';
import { campaignPath } from './notifications/deepLinks.js';

/** One completed session, shared by all dashboard widgets. No writes or polling. */
export async function buildDashboardSessionFollowUp(
  ctx: CampaignContext, userId: string | undefined, session: DashboardLastSessionSummary,
): Promise<DashboardSessionFollowUp> {
  const handle = ctx.campaignHandle ?? ctx.campaignId;
  const sessionHref = campaignPath(handle, 'notes', session.timelinePointId);
  const notesHref = `${sessionHref}/all`;
  const staff = ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW);
  const canReadPage = (visibility: string) => staff || visibility === 'Public' ||
    (visibility === 'Party' && ctx.capabilities.has(C.WIKI_VIEW_PARTY));
  const anchor = await prisma.campaignSessionTimeline.findFirst({
    where: { id: session.timelinePointId, campaignId: ctx.campaignId, wikiPage: { deletedAt: null } },
    select: { wikiPage: { select: { metadata: true, visibility: true } } },
  });
  const unavailable: DashboardSessionFollowUp = {
    myNotes: { state: 'unavailable', href: null, canEdit: false }, contributors: [], notesHref, media: null,
  };
  if (!anchor || !canReadPage(anchor.wikiPage.visibility)) return unavailable;
  const groupId = parseSessionNoteMetadata(anchor.wikiPage.metadata).sessionGroupId ?? session.timelinePointId;
  const [pages, members, globalAudio, campaignAudio] = await Promise.all([
    fetchAuthorPagesForSession(ctx.campaignId, groupId, session.timelinePointId),
    prisma.campaignMember.findMany({ where: { campaignId: ctx.campaignId }, include: {
      user: { select: { email: true, displayName: true } },
      identityPage: { select: { id: true, title: true, visibility: true } },
    }, orderBy: { userId: 'asc' } }),
    prisma.audioSettings.findUnique({ where: { id: 'GLOBAL_AUDIO' } }),
    prisma.campaignAudioSettings.findUnique({ where: { campaignId: ctx.campaignId } }),
  ]);
  const [pagePresence, blockPresence] = staff ? [new Map<string, ContentRevelationState>(), new Map<string, ContentRevelationState>()] : await Promise.all([
    getContentPresenceStateMap(ctx.campaignId, E.WIKI_PAGE, pages.map(page => page.id)),
    getContentPresenceStateBySubEntityMap(ctx.campaignId, pages.flatMap(page =>
      (Array.isArray(page.blocks) ? page.blocks : []).flatMap(block => {
        const id = block && typeof block === 'object' ? (block as { id?: unknown }).id : null;
        return typeof id === 'string' ? [{ entityType: E.WIKI_BLOCK, entityId: page.id, subEntityId: id }] : [];
      }))),
  ]);
  const viewer = buildRevelationViewerContext({ role: null, canManage: staff });
  const presenceVisible = (state: ContentRevelationState | undefined) => isPresenceVisibleToContext(
    state ?? ContentRevelationStates.REVEALED, viewer,
  );
  const visiblePages = pages.filter(page => canReadPage(page.visibility) && presenceVisible(pagePresence.get(page.id)));
  const noteState = (page: typeof pages[number]): 'added' | 'not_added' | 'unavailable' => {
    const blocks = Array.isArray(page.blocks) ? page.blocks as Record<string, unknown>[] : [];
    const visible = blocks.filter(block => presenceVisible(blockPresence.get(`${E.WIKI_BLOCK}:${page.id}:${block.id}`)) &&
      (staff || (block.isPrivate !== true && block.visibility !== 'DM_Only')));
    if (collectMarkdownFromBlocks(visible, staff).some(text => text.trim())) return 'added';
    // A hidden body is not equivalent to an empty note. Do not count it as a contribution.
    if (visible.length !== blocks.length || (!staff && blocks.some(block => block.isPrivate === true || block.visibility === 'DM_Only'))) return 'unavailable';
    return 'not_added';
  };
  const own = pages.find(page => parseSessionNoteMetadata(page.metadata).sessionNoteAuthorId === userId);
  const ownVisible = own && visiblePages.includes(own);
  const ownState = own ? (ownVisible ? noteState(own) : 'unavailable') : 'not_added';
  const myNotes: DashboardSessionFollowUp['myNotes'] = !ctx.isMember || !userId ? unavailable.myNotes : {
    state: ownState,
    href: ownState === 'unavailable' ? null : `${sessionHref}?notes=mine&edit=1`,
    canEdit: ownState !== 'unavailable',
  };
  const contributors: DashboardSessionFollowUp['contributors'] = [];
  const seen = new Set<string>();
  for (const page of visiblePages) {
    const authorId = parseSessionNoteMetadata(page.metadata).sessionNoteAuthorId;
    if (!authorId || seen.has(authorId) || noteState(page) !== 'added') continue;
    const member = members.find(member => member.userId === authorId);
    if (!member) continue;
    const identity = mapMemberToIdentityFields({ ...member,
      identityPage: member.identityPage && canReadPage(member.identityPage.visibility) ? member.identityPage : null,
    }, members.indexOf(member));
    contributors.push({ userId: authorId, label: identity.label, href: notesHref });
    seen.add(authorId);
  }
  if (globalAudio?.enabled === false || campaignAudio?.enabled === false || !ctx.isMember) {
    return { myNotes, contributors, notesHref, media: null };
  }
  const recordings = await prisma.sessionRecording.findMany({
    where: { campaignId: ctx.campaignId, timelineId: session.timelinePointId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    include: {
      files: { select: { durationMs: true, asset: { select: { url: true } } } },
      transcript: { select: { publishedRevisionId: true, revisions: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true } } } },
      jobs: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true } },
    },
  });
  const readable = recordings.filter(row => canReadRecording({
    member: ctx.isMember, sessionVisible: true, staff, manager: ctx.capabilities.has(C.AUDIO_MANAGE),
    uploader: row.uploadedByUserId === userId, visibility: row.visibility,
  }));
  const playable = readable.find(row => row.status === 'ready' && row.files.some(file => !file.asset.url.startsWith('/uploads/missing-')));
  const transcript = readable.find(row => row.transcript?.publishedRevisionId ||
    (ctx.capabilities.has(C.AUDIO_TRANSCRIPT_EDIT) && row.transcript?.revisions.length));
  const mediaHref = (id: string, tab: string) => `${notesHref}?recording=${encodeURIComponent(id)}&audioTab=${tab}#session-recording`;
  let state: NonNullable<DashboardSessionFollowUp['media']>['transcript']['state'] = 'unavailable';
  if (transcript) state = 'ready';
  else if (readable.some(row => row.jobs[0]?.status === 'running')) state = 'processing';
  else if (readable.some(row => row.jobs[0]?.status === 'queued')) state = 'queued';
  else if ((ctx.capabilities.has(C.AUDIO_TRANSCRIPT_EDIT) || ctx.capabilities.has(C.AUDIO_TRANSCRIBE)) &&
    readable.some(row => ['failed', 'interrupted', 'cancelled'].includes(row.jobs[0]?.status ?? ''))) state = 'failed';
  else if (playable && !readable.some(row => row.jobs.length) && globalAudio?.transcriptionEnabled && campaignAudio?.transcriptionEnabled) state = 'not_requested';
  return { myNotes, contributors, notesHref, media: {
    audio: { available: Boolean(playable), href: playable ? mediaHref(playable.id, 'chapters') : null,
      durationMs: playable ? playable.files.filter(file => !file.asset.url.startsWith('/uploads/missing-')).reduce((total, file) => total + file.durationMs, 0) : null },
    transcript: { state, href: transcript ? mediaHref(transcript.id, 'transcript') : null },
  } };
}
