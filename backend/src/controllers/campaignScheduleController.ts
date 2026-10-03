import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  disableScheduling,
  findCanonicalUpcomingSession,
  ScheduleConflictError,
  scheduleUpcomingSession,
  serializeScheduleRow,
  skipSession,
  updateCampaignRecurrence,
} from '../lib/campaignScheduleService.js';
import { isOneShotCampaignFormat } from '../../../shared/campaignScheduleCadence.js';
import { prisma } from '../lib/prisma.js';

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date;
}

function parseOptionalBigInt(value: unknown): bigint | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  try {
    return BigInt(String(value));
  } catch {
    throw new Error('Invalid plannedWorldEpochMinute');
  }
}

export async function getCampaignSchedule(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      scheduleFrequency: true,
      scheduleDay: true,
      scheduleTime: true,
      scheduleTimezone: true,
      schedulingEnabled: true,
      autoScheduleUpcomingSession: true,
      campaignFormat: true,
    },
  });
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const upcoming = await findCanonicalUpcomingSession(campaignId);
  const oneShot = isOneShotCampaignFormat(campaign.campaignFormat);

  res.json({
    schedule: {
      frequency: campaign.scheduleFrequency,
      day: campaign.scheduleDay,
      time: campaign.scheduleTime,
      timezone: campaign.scheduleTimezone,
      schedulingEnabled: campaign.schedulingEnabled,
      autoScheduleUpcomingSession: oneShot ? false : campaign.autoScheduleUpcomingSession,
      isOneShot: oneShot,
    },
    upcoming: upcoming
      ? {
          ...serializeScheduleRow(upcoming),
          sessionTitle: upcoming.sessionTitle,
          sequenceOrder: upcoming.sequenceOrder,
        }
      : null,
  });
}

export async function patchCampaignSchedule(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const authorId = req.user?.id;
  if (!authorId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body as Record<string, unknown>;

  if (body.schedulingEnabled === false) {
    await disableScheduling(campaignId);
  }

  try {
    const { campaign, ensuredUpcoming } = await updateCampaignRecurrence(
      campaignId,
      {
        scheduleFrequency:
          body.scheduleFrequency !== undefined
            ? (body.scheduleFrequency as string | null)
            : undefined,
        scheduleDay:
          body.scheduleDay !== undefined ? (body.scheduleDay as string | null) : undefined,
        scheduleTime:
          body.scheduleTime !== undefined ? (body.scheduleTime as string | null) : undefined,
        scheduleTimezone:
          body.scheduleTimezone !== undefined
            ? (body.scheduleTimezone as string | null)
            : undefined,
        schedulingEnabled:
          body.schedulingEnabled !== undefined
            ? Boolean(body.schedulingEnabled)
            : undefined,
        autoScheduleUpcomingSession:
          body.autoScheduleUpcomingSession !== undefined
            ? Boolean(body.autoScheduleUpcomingSession)
            : undefined,
      },
      { authorIdForEnsure: authorId },
    );

    const upcoming =
      ensuredUpcoming ?? (await findCanonicalUpcomingSession(campaignId));
    const oneShot = isOneShotCampaignFormat(campaign.campaignFormat);

    res.json({
      schedule: {
        frequency: campaign.scheduleFrequency,
        day: campaign.scheduleDay,
        time: campaign.scheduleTime,
        timezone: campaign.scheduleTimezone,
        schedulingEnabled: campaign.schedulingEnabled,
        autoScheduleUpcomingSession: oneShot
          ? false
          : campaign.autoScheduleUpcomingSession,
        isOneShot: oneShot,
      },
      upcoming: upcoming
        ? {
            ...serializeScheduleRow(upcoming),
            sessionTitle: upcoming.sessionTitle,
            sequenceOrder: upcoming.sequenceOrder,
          }
        : null,
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Failed to update schedule',
    });
  }
}

export async function postScheduleUpcoming(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const authorId = req.user?.id;
  if (!authorId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  let plannedStartAt: Date;
  try {
    const parsed = parseOptionalDate(body.plannedStartAt);
    if (!parsed) {
      res.status(400).json({ error: 'plannedStartAt is required' });
      return;
    }
    plannedStartAt = parsed;
  } catch {
    res.status(400).json({ error: 'Invalid plannedStartAt' });
    return;
  }

  let plannedEndAt: Date | null | undefined;
  let plannedWorldEpochMinute: bigint | null | undefined;
  try {
    plannedEndAt = parseOptionalDate(body.plannedEndAt);
    plannedWorldEpochMinute = parseOptionalBigInt(body.plannedWorldEpochMinute);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Invalid schedule fields',
    });
    return;
  }

  try {
    const upcoming = await scheduleUpcomingSession({
      campaignId,
      authorId,
      plannedStartAt,
      plannedEndAt: plannedEndAt ?? null,
      timezone:
        body.timezone !== undefined ? (body.timezone as string | null) : undefined,
      applyRecurrenceChange: Boolean(body.applyRecurrenceChange),
      scheduleFrequency:
        body.scheduleFrequency !== undefined
          ? (body.scheduleFrequency as string | null)
          : undefined,
      scheduleDay:
        body.scheduleDay !== undefined ? (body.scheduleDay as string | null) : undefined,
      scheduleTime:
        body.scheduleTime !== undefined ? (body.scheduleTime as string | null) : undefined,
      scheduleTimezone:
        body.scheduleTimezone !== undefined
          ? (body.scheduleTimezone as string | null)
          : undefined,
      rescheduleExisting: Boolean(body.rescheduleExisting),
      timelinePointId:
        typeof body.timelinePointId === 'string' ? body.timelinePointId : undefined,
      plannedWorldEpochMinute,
      clearPlannedWorldEpochMinute: body.plannedWorldEpochMinute === null,
    });

    res.status(200).json({
      upcoming: {
        ...serializeScheduleRow(upcoming),
        sessionTitle: upcoming.sessionTitle,
        sequenceOrder: upcoming.sequenceOrder,
      },
    });
  } catch (err) {
    if (err instanceof ScheduleConflictError) {
      res.status(409).json({
        error: err.message,
        code: err.code,
        upcoming: {
          ...serializeScheduleRow(err.upcoming),
          sessionTitle: err.upcoming.sessionTitle,
          sequenceOrder: err.upcoming.sequenceOrder,
        },
      });
      return;
    }
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Failed to schedule session',
    });
  }
}

export async function postSkipUpcomingSession(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const authorId = req.user?.id;
  if (!authorId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const timelinePointId =
    typeof body.timelinePointId === 'string'
      ? body.timelinePointId
      : String(req.params.timelinePointId ?? '');

  if (!timelinePointId) {
    res.status(400).json({ error: 'timelinePointId is required' });
    return;
  }

  try {
    const result = await skipSession({
      campaignId,
      timelinePointId,
      authorId,
      reason: typeof body.reason === 'string' ? body.reason : null,
      scheduleNextAutomatically:
        body.scheduleNextAutomatically === undefined
          ? undefined
          : Boolean(body.scheduleNextAutomatically),
    });

    res.json({
      skipped: {
        ...serializeScheduleRow(result.skipped),
        sessionTitle: result.skipped.sessionTitle,
        sequenceOrder: result.skipped.sequenceOrder,
      },
      next: result.next
        ? {
            ...serializeScheduleRow(result.next),
            sessionTitle: result.next.sessionTitle,
            sequenceOrder: result.next.sequenceOrder,
          }
        : null,
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Failed to skip session',
    });
  }
}
