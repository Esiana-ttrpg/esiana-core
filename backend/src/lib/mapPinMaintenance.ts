import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

function hasValidPinTarget(
  pin: { targetPageId: string | null; targetAssetId: string | null },
): boolean {
  return Boolean(pin.targetPageId || pin.targetAssetId);
}

/**
 * When a wiki page is deleted, nullify or purge pins that reference it.
 */
export async function resolvePinsAfterTargetPageDelete(
  pageId: string,
  db: DbClient = prisma,
): Promise<{ purged: number; retargeted: number }> {
  const pins = await db.mapPin.findMany({
    where: { targetPageId: pageId },
    select: { id: true, targetAssetId: true },
  });

  let purged = 0;
  let retargeted = 0;

  for (const pin of pins) {
    if (pin.targetAssetId) {
      await db.mapPin.update({
        where: { id: pin.id },
        data: { targetPageId: null },
      });
      retargeted += 1;
    } else {
      await db.mapPin.delete({ where: { id: pin.id } });
      purged += 1;
    }
  }

  return { purged, retargeted };
}

/**
 * When a nested map asset is deleted, nullify or purge pins that reference it.
 */
export async function resolvePinsAfterTargetAssetDelete(
  assetId: string,
  db: DbClient = prisma,
): Promise<{ purged: number; retargeted: number }> {
  const pins = await db.mapPin.findMany({
    where: { targetAssetId: assetId },
    select: { id: true, targetPageId: true },
  });

  let purged = 0;
  let retargeted = 0;

  for (const pin of pins) {
    if (pin.targetPageId) {
      await db.mapPin.update({
        where: { id: pin.id },
        data: { targetAssetId: null },
      });
      retargeted += 1;
    } else {
      await db.mapPin.delete({ where: { id: pin.id } });
      purged += 1;
    }
  }

  return { purged, retargeted };
}

/** Remove invalid rows where both targets are null (defense in depth). */
export async function purgeInvalidMapPins(
  assetId?: string,
  db: DbClient = prisma,
): Promise<number> {
  const pins = await db.mapPin.findMany({
    where: assetId ? { assetId } : undefined,
    select: { id: true, targetPageId: true, targetAssetId: true },
  });

  const invalidIds = pins
    .filter((pin) => !hasValidPinTarget(pin))
    .map((pin) => pin.id);

  if (invalidIds.length === 0) return 0;

  await db.mapPin.deleteMany({ where: { id: { in: invalidIds } } });
  return invalidIds.length;
}

export async function resolvePinsAfterTargetPageDeletes(
  pageIds: string[],
  db: DbClient,
): Promise<void> {
  for (const pageId of pageIds) {
    await resolvePinsAfterTargetPageDelete(pageId, db);
  }
}
