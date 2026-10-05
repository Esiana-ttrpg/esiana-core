import { Router } from 'express';
import { listMySessionCalendar } from '../controllers/sessionCalendarController.js';
import {
  authenticateApiOrSession,
  requireAuthenticatedApiOrSession,
  requireTokenScopes,
} from '../middleware/auth.js';
import type { NextFunction, Request, Response } from 'express';
import { API_TOKEN_SCOPES } from '../lib/apiToken.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';
import {
  createCalendarSubscription,
  downloadMySessionCalendar,
  getCalendarSubscription,
  getSubscribedSessionCalendar,
  regenerateCalendarSubscription,
  revokeCalendarSubscription,
} from '../controllers/sessionCalendarExportController.js';

export const calendarRouter = Router();

function requireSessionAuthentication(
  req: Request & { authMethod?: string },
  res: Response,
  next: NextFunction,
): void {
  if (req.authMethod !== 'session') {
    res.status(403).json({ error: 'Calendar subscription management requires session authentication' });
    return;
  }
  next();
}

calendarRouter.get(
  '/subscriptions/:token/feed.ics',
  rateLimitPolicy('public'),
  getSubscribedSessionCalendar,
);
calendarRouter.use(authenticateApiOrSession);
calendarRouter.use(requireAuthenticatedApiOrSession);
calendarRouter.use(requireTokenScopes([API_TOKEN_SCOPES.CAMPAIGN_READ]));
calendarRouter.use(rateLimitPolicy('authenticated'));
calendarRouter.use(rateLimitPolicy('apiKey'));
calendarRouter.get('/sessions', listMySessionCalendar);
calendarRouter.get('/sessions.ics', downloadMySessionCalendar);
calendarRouter.get('/subscription', requireSessionAuthentication, getCalendarSubscription);
calendarRouter.post('/subscription', requireSessionAuthentication, createCalendarSubscription);
calendarRouter.post(
  '/subscription/regenerate',
  requireSessionAuthentication,
  regenerateCalendarSubscription,
);
calendarRouter.delete('/subscription', requireSessionAuthentication, revokeCalendarSubscription);
