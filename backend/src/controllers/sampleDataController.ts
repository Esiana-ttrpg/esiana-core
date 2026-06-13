import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { listCoreSampleDataProfiles } from '../lib/sampleData/sampleDataRegistry.js';

export async function listSampleDataProfiles(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  res.json({ profiles: listCoreSampleDataProfiles({ wizardOnly: true }) });
}
