import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getWrappedSeasonalInvite } from '../lib/stats/wrapped/seasonalInvite.js';
import {
  getWrappedYear,
  listWrappedYears,
  regenerateWrappedYear,
} from '../lib/stats/wrapped/wrappedSnapshotService.js';
import {
  getPublicWrappedYear,
  publishWrappedYear,
  unpublishWrappedYear,
} from '../lib/stats/wrapped/wrappedPublicationService.js';

function parseYear(raw: unknown): number | null {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return null;
  return n;
}

function httpErrorStatus(error: unknown): number | null {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }
  return null;
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

export async function postOwnerWrappedYearPublish(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const year = parseYear(req.params.year);
  if (year == null) {
    res.status(400).json({ error: 'year must be a calendar year (YYYY)' });
    return;
  }

  try {
    const result = await publishWrappedYear({
      userId: req.user!.id,
      year,
    });
    res.json(result);
  } catch (error) {
    const status = httpErrorStatus(error) ?? 500;
    res.status(status).json({
      error: error instanceof Error ? error.message : 'Unable to publish Wrapped',
    });
  }
}

export async function deleteOwnerWrappedYearPublish(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const year = parseYear(req.params.year);
  if (year == null) {
    res.status(400).json({ error: 'year must be a calendar year (YYYY)' });
    return;
  }

  try {
    const result = await unpublishWrappedYear({
      userId: req.user!.id,
      year,
    });
    res.json(result);
  } catch (error) {
    const status = httpErrorStatus(error) ?? 500;
    res.status(status).json({
      error: error instanceof Error ? error.message : 'Unable to unpublish Wrapped',
    });
  }
}

/**
 * Public (optional auth) read of an explicitly published edition.
 * Always 404 when unpublished or publishing is disabled — never reveals existence.
 */
export async function getPublishedWrappedYear(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = typeof req.params.id === 'string' ? req.params.id : '';
  const year = parseYear(req.params.year);
  if (!userId || year == null) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const result = await getPublicWrappedYear({ userId, year });
  if (!result) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result);
}
