import { createHash } from 'node:crypto';
import type { Request } from 'express';
import type { Prisma } from './prismaClient.js';
import { assertAudio } from './audioCore.js';

export function assetIdempotencyKey(req: Request): string | undefined {
  const key = req.get('Idempotency-Key');
  assertAudio(key === undefined || /^[A-Za-z0-9._:-]{1,200}$/.test(key), 400, 'invalid_idempotency_key');
  return key;
}

/** Call inside the same serialized transaction as resource creation and quota reservation. */
export async function idempotentAssetCreation<T extends { id: string }>(
  tx: Prisma.TransactionClient,
  scope: { campaignId: string; userId: string; operation: 'recording.create' | 'asset_upload.create' },
  key: string | undefined,
  normalizedRequest: unknown,
  load: (id: string) => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> {
  if (key === undefined) return create();
  const requestHash = createHash('sha256').update(JSON.stringify(normalizedRequest)).digest('hex');
  const receipt = await tx.assetOperationIdempotency.findUnique({ where: {
    campaignId_userId_operation_key: { ...scope, key },
  } });
  if (receipt && receipt.expiresAt > new Date()) {
    assertAudio(receipt.requestHash === requestHash, 409, 'idempotency_key_conflict');
    const resource = await load(receipt.resourceId);
    assertAudio(resource, 410, 'idempotent_resource_deleted');
    return resource;
  }
  if (receipt) await tx.assetOperationIdempotency.delete({ where: { id: receipt.id } });
  const resource = await create();
  await tx.assetOperationIdempotency.create({ data: { ...scope, key, requestHash, resourceId: resource.id,
    expiresAt: new Date(Date.now() + 72 * 3600000) } });
  return resource;
}
