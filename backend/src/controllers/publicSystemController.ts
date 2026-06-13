import type { Request, Response } from 'express';
import {
  getOrCreateSystemSettings,
  serializePublicSystemSettings,
} from '../lib/systemSettings.js';

export async function getPublicSystemStatus(
  _req: Request,
  res: Response,
): Promise<void> {
  const row = await getOrCreateSystemSettings();
  res.json(serializePublicSystemSettings(row));
}
