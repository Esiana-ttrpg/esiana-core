import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';
import { audioHandler, assertAudio, AudioError, audioContext, recordingAccess } from '../lib/audioCore.js';
import { safetyCampaign, safetyEligible, safetyRequest, notifySafety } from '../lib/safetyPrivacy.js';
import { SAFETY_CATEGORIES, SAFETY_CONTENT_TYPES, SAFETY_STATUSES, safetyTransitionAllowed } from '../../../shared/safetyPrivacy.js';

export const safetyPrivacyRouter = Router();
safetyPrivacyRouter.use(requireAuth, rateLimitPolicy('authenticated'), rateLimitPolicy('mutation'));
const text = z.string().trim().min(1).max(10000);
const campaignSelect = { id: true, handle: true, name: true } as const;
const safetyDisplayName = (user: { displayName: string | null }) => user.displayName?.trim() || 'Campaign participant';

safetyPrivacyRouter.get('/campaigns', audioHandler(async (req, res) => {
  const userId = req.user!.id;
  const campaigns = await prisma.campaign.findMany({ where: { OR: [ { members: { some: { userId } } },
    { safetyEligibility: { some: { userId } } }, { sessionRecordings: { some: { uploadedByUserId: userId } } }, { safetyRequests: { some: { requesterId: userId } } },
    { sessionTimelinePoints: { some: { attendance: { some: { userId } } } } } ] }, select: campaignSelect });
  const eligible = [];
  for (const c of campaigns) if ((await safetyEligible(c.handle, userId)).eligible) eligible.push(c);
  res.json(eligible);
}));
safetyPrivacyRouter.get('/recipients/:handle', audioHandler(async (req, res) => {
  const ctx = await safetyEligible(String(req.params.handle), req.user!.id);
  assertAudio(ctx.eligible, 404, 'campaign_not_found');
  const users = await prisma.user.findMany({ where: { id: { in: ctx.reviewers.map(m => m.userId) } }, select: { id: true, displayName: true } });
  res.json(users.map(u => ({ id: u.id, displayName: safetyDisplayName(u) })));
}));
safetyPrivacyRouter.get('/recordings', audioHandler(async (req, res) => {
  const userId = req.user!.id;
  const rows = await prisma.sessionRecording.findMany({ where: { OR: [ { uploadedByUserId: userId },
    { timeline: { attendance: { some: { userId, status: { in: ['ATTENDING', 'LATE'] } } } } } ] },
    include: { campaign: { select: campaignSelect }, timeline: { include: { wikiPage: { select: { title: true, id: true } } } } }, orderBy: [{ campaignId: 'asc' }, { timelineId: 'asc' }, { createdAt: 'desc' }] });
  const visible = [];
  const contexts = new Map<string, ReturnType<typeof audioContext>>();
  for (const row of rows) {
    try {
      let context = contexts.get(row.campaignId);
      if (!context) {
        context = audioContext(row.campaignId, userId);
        contexts.set(row.campaignId, context);
      }
      const ctx = await context;
      await recordingAccess(ctx, userId, row.id);
      visible.push({ id: row.id, title: row.title, campaign: row.campaign, sessionId: row.timelineId, sessionTitle: row.timeline.wikiPage.title });
    } catch (error) { if (!(error instanceof AudioError && [403,404].includes(error.status))) throw error; }
  }
  res.json(visible);
}));
safetyPrivacyRouter.get('/requests', audioHandler(async (req, res) => {
  const userId = req.user!.id, handle = typeof req.query.campaign === 'string' ? req.query.campaign : null;
  let where: { campaignId?: string; requesterId?: string } = { requesterId: userId };
  if (handle) {
    const ctx = await safetyCampaign(handle, userId);
    assertAudio(ctx.manager, 403, 'operation_forbidden');
    where = { campaignId: ctx.campaign.id };
  }
  const rows = await prisma.safetyPrivacyRequest.findMany({ where, include: { campaign: { select: campaignSelect }, reads: { where: { userId } } }, orderBy: { updatedAt: 'desc' } });
  res.json(rows.map(({ reads, ...r }) => ({ ...r, unread: reads[0]?.revision !== r.revision })));
}));
safetyPrivacyRouter.post('/requests', audioHandler(async (req, res) => {
  const data = z.object({ campaign: z.string().min(1).max(200), category: z.enum(SAFETY_CATEGORIES), description: text,
    relatedContentType: z.enum(SAFETY_CONTENT_TYPES).optional(), relatedContentId: z.string().trim().min(1).max(300).optional(),
    recipientIds: z.array(z.string()).max(1000) }).strict().parse(req.body);
  assertAudio(!!data.relatedContentType === !!data.relatedContentId, 400, 'related_reference_incomplete');
  const userId = req.user!.id, ctx = await safetyEligible(data.campaign, userId);
  assertAudio(ctx.eligible, 404, 'campaign_not_found');
  const actual = ctx.reviewers.map(m => m.userId).sort();
  assertAudio(actual.length && JSON.stringify([...new Set(data.recipientIds)].sort()) === JSON.stringify(actual), 409, 'reviewers_changed');
  // Opaque references may describe unlisted/deleted content. They never authorize reading it.
  const row = await prisma.safetyPrivacyRequest.create({ data: { campaignId: ctx.campaign.id, requesterId: userId,
    category: data.category, description: data.description, relatedContentType: data.relatedContentType,
    relatedContentId: data.relatedContentId, events: { create: { actorId: userId, newStatus: 'open' } } } });
  await notifySafety(row, userId, true);
  res.status(201).json(row);
}));
safetyPrivacyRouter.get('/requests/:id', audioHandler(async (req, res) => {
  const userId = req.user!.id, { request, context } = await safetyRequest(String(req.params.id), userId);
  const row = await prisma.safetyPrivacyRequest.findUniqueOrThrow({ where: { id: request.id }, include: {
    messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } });
  await prisma.safetyPrivacyRequestRead.upsert({ where: { requestId_userId: { requestId: row.id, userId } },
    create: { requestId: row.id, userId, revision: row.revision }, update: { revision: row.revision } });
  const reviewerIds = context.reviewers.map(m => m.userId);
  const people = await prisma.user.findMany({ where: { id: { in: [...reviewerIds, row.requesterId, ...row.messages.map(m => m.authorId), ...row.events.map(e => e.actorId)] } }, select: { id: true, displayName: true } });
  // No content is hydrated here: links go through the normal permission-checked APIs.
  res.json({ ...row, manager: context.manager, campaign: request.campaign, reviewerIds, people: people.map(u => ({ id: u.id, displayName: safetyDisplayName(u) })) });
}));
safetyPrivacyRouter.post('/requests/:id/messages', audioHandler(async (req, res) => {
  const { body } = z.object({ body: text }).strict().parse(req.body);
  const userId = req.user!.id, { request } = await safetyRequest(String(req.params.id), userId);
  const message = await prisma.$transaction(async tx => {
    await tx.safetyPrivacyRequest.update({ where: { id: request.id }, data: { revision: { increment: 1 } } });
    return tx.safetyPrivacyRequestMessage.create({ data: { requestId: request.id, authorId: userId, body } });
  });
  await notifySafety(request, userId, request.requesterId === userId);
  res.status(201).json(message);
}));
safetyPrivacyRouter.patch('/requests/:id/status', audioHandler(async (req, res) => {
  const data = z.object({ status: z.enum(SAFETY_STATUSES), reason: text.optional(), expectedRevision: z.number().int().nonnegative() }).strict().parse(req.body);
  const userId = req.user!.id, { request, context } = await safetyRequest(String(req.params.id), userId);
  assertAudio(request.revision === data.expectedRevision, 409, 'request_changed');
  assertAudio(safetyTransitionAllowed(request.status, data.status, context.manager, data.reason), 400, 'invalid_status_transition_or_missing_reason');
  await prisma.$transaction(async tx => {
    const terminal = ['resolved','declined'].includes(data.status);
    const result = await tx.safetyPrivacyRequest.updateMany({ where: { id: request.id, revision: data.expectedRevision }, data: {
      status: data.status, revision: { increment: 1 }, resolution: terminal ? data.reason : null, resolvedAt: terminal ? new Date() : null, resolverId: terminal ? userId : null } });
    assertAudio(result.count, 409, 'request_changed');
    await tx.safetyPrivacyRequestEvent.create({ data: { requestId: request.id, actorId: userId, previousStatus: request.status, newStatus: data.status, reason: data.reason } });
  });
  await notifySafety(request, userId, data.status === 'open');
  res.json({ updated: true });
}));
