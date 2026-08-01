import { prisma } from '../prisma.js';

/** Invalidate all existing session cookies for this user. */
export async function bumpUserSessionVersion(userId: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return user.sessionVersion;
}
