import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getWrappedSeasonalInvite } from '../lib/stats/wrapped/seasonalInvite.js';
import {
  getWrappedYear,
  listWrappedYears,
  regenerateWrappedYear,
} from '../lib/stats/wrapped/wrappedSnapshotService.js';

function parseYear(raw: unknown): number | null {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return null;
  return n;
}

export async function getOwnerWrappedYears(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const payload = await listWrappedYears({ userId: req.user!.id });
  res.json(payload);
}

export async function getOwnerWrappedSeasonalInvite(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const payload = await getWrappedSeasonalInvite({ userId: req.user!.id });
  res.json(payload);
}

export async function getOwnerWrappedYear(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const year = parseYear(req.params.year);
  if (year == null) {
    res.status(400).json({ error: 'year must be a calendar year (YYYY)' });
    return;
  }

  const result = await getWrappedYear({ userId: req.user!.id, year });
  if ('unavailable' in result && result.unavailable) {
    res.status(404).json({
      error: 'Wrapped edition unavailable',
      summary: result.summary,
    });
    return;
  }
  res.json(result);
}

export async function postOwnerWrappedYearRegenerate(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const year = parseYear(req.params.year);
  if (year == null) {
    res.status(400).json({ error: 'year must be a calendar year (YYYY)' });
    return;
  }

  const result = await regenerateWrappedYear({ userId: req.user!.id, year });
  if ('unavailable' in result && result.unavailable) {
    res.status(404).json({
      error: 'Wrapped edition unavailable',
      summary: result.summary,
    });
    return;
  }
  res.json(result);
}
