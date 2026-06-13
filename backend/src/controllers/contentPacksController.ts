import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { listEnabledContentPacks } from '../lib/sampleData/contentPackRegistry.js';

export async function listContentPacks(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const packs = await listEnabledContentPacks();
  res.json({ packs });
}
