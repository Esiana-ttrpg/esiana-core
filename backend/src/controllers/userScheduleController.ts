import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  buildUserSchedule,
  getUserSchedulePreferences,
  parseVacationDateInput,
  patchUserSchedulePreferences,
} from '../lib/userScheduleService.js';

function parseRangeDate(raw: unknown, label: string): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const asVacation = parseVacationDateInput(raw);
  if (asVacation) {
    // for `to`, treat as end of day
    if (label === 'to') {
      return new Date(asVacation.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
    return asVacation;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function getUserSchedule(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const from = parseRangeDate(req.query.from, 'from');
  const to = parseRangeDate(req.query.to, 'to');
  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params are required (ISO date).' });
    return;
  }
  if (from.getTime() > to.getTime()) {
    res.status(400).json({ error: 'from must be on or before to.' });
    return;
  }

  const payload = await buildUserSchedule({
    userId: req.user!.id,
    from,
    to,
  });
  res.json(payload);
}

export async function getUserSchedulePreferencesHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const preferences = await getUserSchedulePreferences(req.user!.id);
  res.json({ preferences });
}

export async function patchUserSchedulePreferencesHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const preferences = await patchUserSchedulePreferences(req.user!.id, req.body ?? {});
    res.json({ preferences });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid schedule preferences';
    res.status(400).json({ error: message });
  }
}
