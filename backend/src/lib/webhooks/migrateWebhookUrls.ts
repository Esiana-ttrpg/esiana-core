import { encryptSecretOrDevStore } from '../crypto/secretBox.js';
import { prisma } from '../prisma.js';

function isEncryptedUrl(value: string): boolean {
  if (value.startsWith('dev:')) return true;
  return !value.startsWith('https://');
}

/** Encrypts the complete legacy URL, including any credential-bearing path. */
export async function migrateWebhookUrlsAtRest(): Promise<number> {
  const endpoints = await prisma.webhookEndpoint.findMany({ select: { id: true, urlEnc: true } });
  let migrated = 0;
  for (const endpoint of endpoints) {
    if (isEncryptedUrl(endpoint.urlEnc)) continue;
    await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { urlEnc: encryptSecretOrDevStore(endpoint.urlEnc) } });
    migrated += 1;
  }
  return migrated;
}
