import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../lib/prismaClient.js';
import { hashApiToken } from '../lib/apiToken.js';
import { serializeSessionCalendarIcs } from '../lib/sessionCalendarIcs.js';
import { loadVisibleUserCalendarEvents } from './sessionCalendarController.js';

function newSubscriptionSecret(): string {
  return randomBytes(32).toString('base64url');
}

function subscriptionUrl(secret: string): string {
  return new URL(
    `/api/calendar/subscriptions/${encodeURIComponent(secret)}/feed.ics`,
    `${env.backendPublicOrigin.replace(/\/$/, '')}/`,
  ).toString();
}

async function sendUserCalendarIcs(
  userId: string,
  res: Response,
  attachment: boolean,
): Promise<void> {
  const events = await loadVisibleUserCalendarEvents(userId);
  const body = serializeSessionCalendarIcs(events, {
    publicOrigin: env.frontendOrigin,
  });
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  if (attachment) {
    res.setHeader('Content-Disposition', 'attachment; filename="esiana-sessions.ics"');
  }
  res.send(body);
}

export async function downloadMySessionCalendar(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  await sendUserCalendarIcs(req.user!.id, res, true);
}

export async function getCalendarSubscription(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const row = await prisma.userCalendarSubscription.findUnique({
    where: { userId: req.user!.id },
    select: { createdAt: true, updatedAt: true, lastAccessAt: true },
  });
  res.json({
    subscription: row
      ? {
          active: true,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          lastAccessAt: row.lastAccessAt?.toISOString() ?? null,
        }
      : null,
  });
}

async function issueSubscription(
  userId: string,
  replace: boolean,
  res: Response,
): Promise<void> {
  const secret = newSubscriptionSecret();
  const tokenHash = hashApiToken(secret);
  let existing = false;
  let row: { createdAt: Date; updatedAt: Date };

  if (replace) {
    existing = Boolean(
      await prisma.userCalendarSubscription.findUnique({
        where: { userId },
        select: { userId: true },
      }),
    );
    row = await prisma.userCalendarSubscription.upsert({
      where: { userId },
      create: { userId, tokenHash },
      update: { tokenHash, lastAccessAt: null },
      select: { createdAt: true, updatedAt: true },
    });
  } else {
    try {
      row = await prisma.userCalendarSubscription.create({
        data: { userId, tokenHash },
        select: { createdAt: true, updatedAt: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        res.status(409).json({
          error: 'A calendar subscription is already active; regenerate it to issue a new URL',
        });
        return;
      }
      throw error;
    }
  }
  res.status(existing ? 200 : 201).json({
    subscription: {
      active: true,
      url: subscriptionUrl(secret),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function createCalendarSubscription(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  await issueSubscription(req.user!.id, false, res);
}

export async function regenerateCalendarSubscription(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  await issueSubscription(req.user!.id, true, res);
}

export async function revokeCalendarSubscription(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  await prisma.userCalendarSubscription.deleteMany({
    where: { userId: req.user!.id },
  });
  res.json({ ok: true });
}

export async function getSubscribedSessionCalendar(
  req: Request,
  res: Response,
): Promise<void> {
  const secret = String(req.params.token ?? '');
  const row = secret
    ? await prisma.userCalendarSubscription.findUnique({
        where: { tokenHash: hashApiToken(secret) },
        select: { userId: true },
      })
    : null;
  if (!row) {
    res.status(404).json({ error: 'Calendar subscription not found' });
    return;
  }
  void prisma.userCalendarSubscription.update({
    where: { userId: row.userId },
    data: { lastAccessAt: new Date() },
  }).catch(() => undefined);
  await sendUserCalendarIcs(row.userId, res, false);
}
