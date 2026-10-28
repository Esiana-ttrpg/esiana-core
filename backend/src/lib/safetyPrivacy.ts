import { prisma } from './prisma.js';
import { buildCampaignActor, can } from '../../../shared/campaignPolicy/policy.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { AudioError } from './audioCore.js';
import { notifyUsers } from './notifications/notificationService.js';

// Load current grants directly: revocations must take effect on the next request.
export async function safetyCampaign(handle: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { handle }, include: { members: true, roleCapabilityOverrides: true } });
  if (!campaign) throw new AudioError(404, 'campaign_not_found');
  const member = campaign.members.find(m => m.userId === userId);
  const actorFor = (id: string, role: string) => buildCampaignActor({ kind: 'member', userId: id, membershipRole: role,
    campaignOwnerUserId: campaign.campaignOwnerUserId, discoverability: campaign.discoverability,
    allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement, roleCapabilityOverrides: campaign.roleCapabilityOverrides });
  const reviewers = campaign.members.filter(m => can(actorFor(m.userId, m.role), C.SAFETY_MANAGE));
  return { campaign, member, reviewers, manager: !!member && can(actorFor(userId, member.role), C.SAFETY_MANAGE),
    submit: !!member && can(actorFor(userId, member.role), C.SAFETY_SUBMIT) };
}

export async function safetyEligible(handle: string, userId: string) {
  const context = await safetyCampaign(handle, userId);
  if (context.member) return { ...context, eligible: context.submit };
  const campaignId = context.campaign.id;
  const [retained, previous, attendance, upload] = await Promise.all([
    prisma.safetyPrivacyEligibility.findUnique({ where: { campaignId_userId: { campaignId, userId } } }),
    prisma.safetyPrivacyRequest.findFirst({ where: { campaignId, requesterId: userId }, select: { id: true } }),
    prisma.sessionAttendance.findFirst({ where: { userId, timelinePoint: { campaignId } }, select: { userId: true } }),
    prisma.sessionRecording.findFirst({ where: { campaignId, uploadedByUserId: userId }, select: { id: true } }),
  ]);
  return { ...context, eligible: !!(retained || previous || attendance || upload) };
}

export async function safetyRequest(id: string, userId: string) {
  const request = await prisma.safetyPrivacyRequest.findUnique({ where: { id }, include: { campaign: { select: { handle: true, name: true } } } });
  if (!request) throw new AudioError(404, 'request_not_found');
  const context = await safetyCampaign(request.campaign.handle, userId);
  if (request.requesterId !== userId && !context.manager) throw new AudioError(404, 'request_not_found');
  return { request, context };
}

export async function notifySafety(request: { id: string; requesterId: string; campaignId: string }, actorId: string, toReviewers: boolean) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: request.campaignId } });
  const context = await safetyCampaign(campaign.handle, actorId);
  const ids = toReviewers ? context.reviewers.map(m => m.userId) : [request.requesterId];
  const path = toReviewers ? '/campaigns/' + encodeURIComponent(campaign.handle) + '/settings?tab=safety-privacy' : '/settings?tab=safety-privacy';
  await notifyUsers({ userIds: [...new Set(ids)].filter(id => id !== actorId), type: 'GENERIC',
    title: 'Safety & Privacy request updated in ' + campaign.name, campaignId: campaign.id,
    linkUrl: path + '&request=' + encodeURIComponent(request.id), metadata: { safetyRequestId: request.id } });
}
