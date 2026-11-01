import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  getOrCreateSystemSettings,
  serializePublicSystemSettings,
} from '../lib/systemSettings.js';

export async function getPublicSystemStatus(
  _req: Request,
  res: Response,
): Promise<void> {
  const [row, userCount] = await Promise.all([
    getOrCreateSystemSettings(),
    prisma.user.count(),
  ]);
  res.json(
    serializePublicSystemSettings(row, { userTableEmpty: userCount === 0 }),
  );
}
