import type { Response } from 'express';

/** Contain domains whose shared audience projection is not implemented (currently Character). */
export function rejectUnverifiedAudiencePreview(
  requested: unknown,
  canManage: boolean,
  res: Pick<Response, 'status' | 'json'>,
): boolean {
  if (!canManage || (requested !== 'true' && requested !== '1')) return false;
  res.status(503).json({ error: 'Audience preview is temporarily unavailable.' });
  return true;
}
