import type { Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  CampaignMemberRoles,
  JoinRequestStatus,
  type JoinRequestStatusType,
} from '../types/domain.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { sanitizeRecruitmentText } from '../lib/recruitment.js';
import { resolveUserDisplayName } from '../lib/userDisplay.js';
import { computeScheduleOverlap } from '../lib/scheduleOverlap.js';
import { sanitizeGmStyleTags } from '../lib/gmStyleTags.js';
import {
  declineReasonRequiresMessage,
  getDeclineReasonLabel,
  isValidDeclineReasonCode,
} from '../lib/joinRequestDeclineReasons.js';
import {
  notifyUsersAsync,
  getOperationalManagerUserIds,
} from '../lib/notifications/notificationService.js';
import { NotificationType } from '../lib/notifications/types.js';
import {
  campaignDashboardPath,
  campaignSettingsPath,
  hubPath,
} from '../lib/notifications/deepLinks.js';
import { isListedOnGlobalHub, resolveDiscoverability } from '../../../shared/campaignPolicy/discoverability.js';

const APPLICATION_MESSAGE_MAX = 2000;

const SEATS_FULL_ERROR =
  'Cannot accept applicant. The maximum player seats for this campaign have already been filled.';

const JOIN_REQUEST_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  pronouns: true,
  timezone: true,
  publicBio: true,
  gmStyleTags: true,
} as const;

function excerptBio(bio: string | null | undefined, max = 160): string | null {
  const trimmed = bio?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function serializeJoinRequest(
  row: {
    id: string;
    message: string;
    status: string;
    createdAt: Date;
    user: {
      id: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
      pronouns: string | null;
      timezone: string | null;
      publicBio: string | null;
      gmStyleTags: unknown;
    };
  },
  scheduleContext?: {
    scheduleDay: string | null;
    scheduleTime: string | null;
    scheduleTimezone: string | null;
  },
) {
  const scheduleOverlap = scheduleContext
    ? computeScheduleOverlap({
        applicantTimezone: row.user.timezone,
        scheduleDay: scheduleContext.scheduleDay,
        scheduleTime: scheduleContext.scheduleTime,
        scheduleTimezone: scheduleContext.scheduleTimezone,
      })
    : undefined;

  return {
    id: row.id,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    ...(scheduleOverlap ? { scheduleOverlap } : {}),
    user: {
      id: row.user.id,
      label: resolveUserDisplayName(row.user),
      email: row.user.email,
      avatarUrl: row.user.avatarUrl,
      pronouns: row.user.pronouns,
      timezone: row.user.timezone,
      gmStyleTags: sanitizeGmStyleTags(row.user.gmStyleTags),
      publicBioExcerpt: excerptBio(row.user.publicBio),
    },
  };
}

function isJoinRequestStatus(value: string): value is JoinRequestStatusType {
  return (Object.values(JoinRequestStatus) as string[]).includes(value);
}

function getCampaignIdParam(req: {
  params: { campaignId?: string; id?: string; campaignHandle?: string };
}): string {
  return String(req.params.campaignId ?? req.params.id ?? req.params.campaignHandle);
}

async function countPlayerSeats(
  db: Prisma.TransactionClient | typeof prisma,
  campaignId: string,
): Promise<number> {
  return db.campaignMember.count({
    where: {
      campaignId,
      role: CampaignMemberRoles.PARTICIPANT,
    },
  });
}

async function resolveJoinRequestByStatus(
  campaignId: string,
  requestId: string,
  status: JoinRequestStatusType,
  res: Response,
  decline?: { declineReasonCode?: string | null; declineMessage?: string | null },
): Promise<void> {
  const joinRequest = await prisma.campaignJoinRequest.findFirst({
    where: {
      id: requestId,
      campaignId,
    },
    include: {
      user: { select: JOIN_REQUEST_USER_SELECT },
    },
  });

  if (!joinRequest) {
    res.status(404).json({ error: 'Join request not found' });
    return;
  }

  if (joinRequest.status !== JoinRequestStatus.PENDING) {
    res.status(400).json({ error: 'This application has already been processed' });
    return;
  }

  if (status === JoinRequestStatus.REJECTED) {
    const declineReasonCode = decline?.declineReasonCode?.trim() || null;
    const declineMessage = sanitizeRecruitmentText(decline?.declineMessage, 1000);

    if (declineReasonCode && !isValidDeclineReasonCode(declineReasonCode)) {
      res.status(400).json({ error: 'Invalid decline reason.' });
      return;
    }
    if (
      declineReasonCode &&
      declineReasonRequiresMessage(declineReasonCode) &&
      !declineMessage
    ) {
      res.status(400).json({ error: 'A message is required for this decline reason.' });
      return;
    }

    const updated = await prisma.campaignJoinRequest.update({
      where: { id: requestId },
      data: {
        status: JoinRequestStatus.REJECTED,
        declineReasonCode,
        declineMessage: declineMessage || null,
      },
      include: {
        user: { select: JOIN_REQUEST_USER_SELECT },
      },
    });

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { handle: true, name: true, discoverability: true },
    });

    const reasonLabel = declineReasonCode
      ? getDeclineReasonLabel(declineReasonCode)
      : null;
    const notificationBody = declineMessage
      ? declineMessage
      : reasonLabel
        ? `Your request was not accepted: ${reasonLabel}.`
        : 'Your request to join this campaign was not accepted.';

    notifyUsersAsync({
      userIds: [updated.userId],
      type: NotificationType.JOIN_REQUEST_DENIED,
      title: `Application declined${campaign ? `: ${campaign.name}` : ''}`,
      body: notificationBody,
      linkUrl:
        campaign?.handle &&
        isListedOnGlobalHub(resolveDiscoverability(campaign.discoverability))
          ? `/recruitment/${campaign.handle}`
          : hubPath(),
      campaignId,
    });

    res.json({ request: serializeJoinRequest(updated) });
    return;
  }

  const existingMember = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: {
        userId: joinRequest.userId,
        campaignId,
      },
    },
  });

  if (existingMember) {
    res.status(409).json({ error: 'User is already a campaign member' });
    return;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const lockedRequest = await tx.campaignJoinRequest.findFirst({
        where: {
          id: requestId,
          campaignId,
          status: JoinRequestStatus.PENDING,
        },
      });

      if (!lockedRequest) {
        throw new Error('APPLICATION_ALREADY_PROCESSED');
      }

      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { maxSeats: true },
      });

      if (!campaign) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const playerSeatCount = await countPlayerSeats(tx, campaignId);

      if (campaign.maxSeats > 0 && playerSeatCount >= campaign.maxSeats) {
        throw new Error('SEATS_FULL');
      }

      const duplicateMember = await tx.campaignMember.findUnique({
        where: {
          userId_campaignId: {
            userId: lockedRequest.userId,
            campaignId,
          },
        },
      });

      if (duplicateMember) {
        throw new Error('ALREADY_MEMBER');
      }

      await tx.campaignMember.create({
        data: {
          userId: lockedRequest.userId,
          campaignId,
          role: CampaignMemberRoles.PARTICIPANT,
        },
      });

      return tx.campaignJoinRequest.update({
        where: { id: requestId },
        data: {
          status: JoinRequestStatus.ACCEPTED,
          declineReasonCode: null,
          declineMessage: null,
        },
        include: {
          user: { select: JOIN_REQUEST_USER_SELECT },
        },
      });
    });

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { handle: true, name: true },
    });

    notifyUsersAsync({
      userIds: [updated.userId],
      type: NotificationType.JOIN_REQUEST_ACCEPTED,
      title: `Welcome${campaign ? ` to ${campaign.name}` : ''}!`,
      body: 'Your join request was accepted. Jump into the campaign dashboard.',
      linkUrl: campaign ? campaignDashboardPath(campaign.handle) : hubPath(),
      campaignId,
    });

    res.json({ request: serializeJoinRequest(updated) });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'SEATS_FULL') {
        res.status(400).json({ error: SEATS_FULL_ERROR });
        return;
      }
      if (err.message === 'APPLICATION_ALREADY_PROCESSED') {
        res.status(400).json({ error: 'This application has already been processed' });
        return;
      }
      if (err.message === 'ALREADY_MEMBER') {
        res.status(409).json({ error: 'User is already a campaign member' });
        return;
      }
      if (err.message === 'CAMPAIGN_NOT_FOUND') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
    }
    console.error('Join request acceptance failed:', err);
    res.status(500).json({ error: 'Unable to process join request' });
  }
}

export async function listCampaignJoinRequests(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const [requests, campaign] = await Promise.all([
    prisma.campaignJoinRequest.findMany({
      where: { campaignId },
      include: {
        user: { select: JOIN_REQUEST_USER_SELECT },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        scheduleDay: true,
        scheduleTime: true,
        scheduleTimezone: true,
      },
    }),
  ]);

  const scheduleContext = campaign
    ? {
        scheduleDay: campaign.scheduleDay,
        scheduleTime: campaign.scheduleTime,
        scheduleTimezone: campaign.scheduleTimezone,
      }
    : undefined;

  res.json({
    requests: requests.map((row) => serializeJoinRequest(row, scheduleContext)),
  });
}

/** PUT /api/campaigns/:campaignId/requests/:requestId — body: { status: ACCEPTED | REJECTED } */
export async function resolveCampaignJoinRequest(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = getCampaignIdParam(req);
  const requestId = String(req.params.requestId);
  const { status, declineReasonCode, declineMessage } = req.body as {
    status?: string;
    declineReasonCode?: string | null;
    declineMessage?: string | null;
  };

  if (!status || !isJoinRequestStatus(status)) {
    res.status(400).json({
      error: `status must be "${JoinRequestStatus.ACCEPTED}" or "${JoinRequestStatus.REJECTED}"`,
    });
    return;
  }

  if (
    status !== JoinRequestStatus.ACCEPTED &&
    status !== JoinRequestStatus.REJECTED
  ) {
    res.status(400).json({
      error: `status must be "${JoinRequestStatus.ACCEPTED}" or "${JoinRequestStatus.REJECTED}"`,
    });
    return;
  }

  await resolveJoinRequestByStatus(campaignId, requestId, status, res, {
    declineReasonCode,
    declineMessage,
  });
}

/** Legacy PATCH /api/campaign/:campaignId/join-requests/:requestId — body: { action: accept | reject } */
export async function respondToJoinRequest(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const requestId = String(req.params.requestId);
  const { action, declineReasonCode, declineMessage } = req.body as {
    action?: string;
    declineReasonCode?: string | null;
    declineMessage?: string | null;
  };

  if (action !== 'accept' && action !== 'reject') {
    res.status(400).json({ error: 'action must be "accept" or "reject"' });
    return;
  }

  const status =
    action === 'accept'
      ? JoinRequestStatus.ACCEPTED
      : JoinRequestStatus.REJECTED;

  await resolveJoinRequestByStatus(campaignId, requestId, status, res, {
    declineReasonCode,
    declineMessage,
  });
}

/** POST /api/campaigns/:campaignId/apply */
export async function applyToCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignKey = getCampaignIdParam(req);
  const { message, inviteToken } = req.body as {
    message?: unknown;
    inviteToken?: unknown;
  };

  let campaign = await prisma.campaign.findUnique({
    where: { id: campaignKey },
    select: {
      id: true,
      inviteToken: true,
      isLookingForGroup: true,
      discoverability: true,
      maxSeats: true,
    },
  });

  if (!campaign) {
    campaign = await prisma.campaign.findUnique({
      where: { handle: campaignKey },
      select: {
        id: true,
        inviteToken: true,
        isLookingForGroup: true,
        discoverability: true,
        maxSeats: true,
      },
    });
  }

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const normalizedInviteToken =
    typeof inviteToken === 'string' && inviteToken.trim().length > 0
      ? inviteToken.trim()
      : null;
  const sanitizedMessage = sanitizeRecruitmentText(message, APPLICATION_MESSAGE_MAX);

  if (normalizedInviteToken === null && !sanitizedMessage) {
    res.status(400).json({
      error: `Application message is required (max ${APPLICATION_MESSAGE_MAX} characters)`,
    });
    return;
  }

  if (normalizedInviteToken !== null) {
    if (!campaign.inviteToken || normalizedInviteToken !== campaign.inviteToken) {
      res.status(403).json({ error: 'Invalid invite token' });
      return;
    }
  }

  if (normalizedInviteToken === null && !campaign.isLookingForGroup) {
    res.status(400).json({ error: 'This campaign is not recruiting players' });
    return;
  }

  if (
    normalizedInviteToken === null &&
    !isListedOnGlobalHub(resolveDiscoverability(campaign.discoverability))
  ) {
    res.status(403).json({
      error: 'This campaign is not open for public applications',
    });
    return;
  }

  const existingMember = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: {
        userId: req.user!.id,
        campaignId: campaign.id,
      },
    },
  });

  if (existingMember) {
    res.status(409).json({ error: 'You are already a member of this campaign' });
    return;
  }

  const playerSeatCount = await countPlayerSeats(prisma, campaign.id);
  if (campaign.maxSeats > 0 && playerSeatCount >= campaign.maxSeats) {
    res.status(400).json({ error: SEATS_FULL_ERROR });
    return;
  }

  if (normalizedInviteToken !== null) {
    await prisma.campaignMember.create({
      data: {
        campaignId: campaign.id,
        userId: req.user!.id,
        role: CampaignMemberRoles.PARTICIPANT,
      },
    });

    const campaignMeta = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: { handle: true, name: true },
    });

    notifyUsersAsync({
      userIds: [req.user!.id],
      type: NotificationType.GENERIC,
      title: `Joined campaign${campaignMeta ? `: ${campaignMeta.name}` : ''}`,
      body: 'You joined this campaign using an invite link.',
      linkUrl: campaignMeta ? campaignDashboardPath(campaignMeta.handle) : hubPath(),
      campaignId: campaign.id,
    });

    res.status(201).json({ joined: true });
    return;
  }

  const pending = await prisma.campaignJoinRequest.findFirst({
    where: {
      campaignId: campaign.id,
      userId: req.user!.id,
      status: JoinRequestStatus.PENDING,
    },
  });

  if (pending) {
    res.status(409).json({ error: 'You already have a pending application' });
    return;
  }

  const created = await prisma.campaignJoinRequest.create({
    data: {
      campaignId: campaign.id,
      userId: req.user!.id,
      message: sanitizedMessage!,
      status: JoinRequestStatus.PENDING,
    },
    include: {
      user: { select: JOIN_REQUEST_USER_SELECT },
    },
  });

  const campaignMeta = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    select: { handle: true, name: true },
  });

  const managerIds = await getOperationalManagerUserIds(campaign.id);
  notifyUsersAsync({
    userIds: managerIds,
    type: NotificationType.JOIN_REQUEST_RECEIVED,
    title: `New join request${campaignMeta ? `: ${campaignMeta.name}` : ''}`,
    body: `${resolveUserDisplayName(created.user)} applied to join the campaign.`,
    linkUrl: campaignMeta
      ? campaignSettingsPath(campaignMeta.handle, 'recruitment')
      : hubPath(),
    campaignId: campaign.id,
  });

  res.status(201).json({ request: serializeJoinRequest(created) });
}
