import type { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from './auth.js';

/**
 * Requires an authenticated user with platform `SYSTEM_ADMIN` role.
 * Chain after `requireAuth`.
 */
export function verifySystemAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== UserRole.SYSTEM_ADMIN) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}
