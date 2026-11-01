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
  const [row, firstUser] = await Promise.all([
    getOrCreateSystemSettings(),
    prisma.user.findFirst({ select: { id: true } }),
  ]);
  res.json(
    serializePublicSystemSettings(row, { userTableEmpty: firstUser == null }),
  );
}
