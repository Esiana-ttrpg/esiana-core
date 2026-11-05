import type { Response } from 'express';

/** Fail closed until Adventure, quest and thread preview projections are audited end to end. */
export function rejectUnverifiedAudiencePreview(
  requested: unknown,
  canManage: boolean,
  res: Pick<Response, 'status' | 'json'>,
): boolean {
  if (!canManage || (requested !== 'true' && requested !== '1')) return false;
  res.status(503).json({ error: 'Audience preview is temporarily unavailable.' });
  return true;
}
