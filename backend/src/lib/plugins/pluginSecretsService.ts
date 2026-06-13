import { prisma } from '../prisma.js';
import {
  decryptSecretOrDevStore,
  encryptSecretOrDevStore,
} from '../crypto/secretBox.js';

export async function getPluginSecret(
  pluginId: string,
  campaignId: string,
  key: string,
): Promise<string | null> {
  const row = await prisma.pluginSecret.findUnique({
    where: {
      pluginId_campaignId_key: { pluginId, campaignId, key },
    },
    select: { valueEnc: true },
  });
  if (!row) return null;
  return decryptSecretOrDevStore(row.valueEnc);
}

export async function setPluginSecret(
  pluginId: string,
  campaignId: string,
  key: string,
  value: string,
): Promise<void> {
  const valueEnc = encryptSecretOrDevStore(value);
  await prisma.pluginSecret.upsert({
    where: {
      pluginId_campaignId_key: { pluginId, campaignId, key },
    },
    create: { pluginId, campaignId, key, valueEnc },
    update: { valueEnc },
  });
}

export async function deletePluginSecret(
  pluginId: string,
  campaignId: string,
  key: string,
): Promise<void> {
  await prisma.pluginSecret.deleteMany({
    where: { pluginId, campaignId, key },
  });
}

export async function deleteAllPluginSecrets(pluginId: string): Promise<void> {
  await prisma.pluginSecret.deleteMany({ where: { pluginId } });
}

export async function deleteCampaignPluginSecrets(
  pluginId: string,
  campaignId: string,
): Promise<void> {
  await prisma.pluginSecret.deleteMany({ where: { pluginId, campaignId } });
}

export async function listPluginSecretKeys(
  pluginId: string,
  campaignId: string,
): Promise<string[]> {
  const rows = await prisma.pluginSecret.findMany({
    where: { pluginId, campaignId },
    select: { key: true },
    orderBy: { key: 'asc' },
  });
  return rows.map((row: { key: string }) => row.key);
}
