/**
 * One-off: point existing GLOBAL_CONFIG rows at the official community registry.
 * Safe to run multiple times (only updates known legacy placeholder URLs).
 *
 * Usage (from repo root):
 *   npm run db:migrate-registry-url
 */
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_PLUGIN_REGISTRY_URL,
  LEGACY_PLUGIN_REGISTRY_URLS,
} from '../../src/lib/pluginManifest.js';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.systemSetting.updateMany({
    where: {
      pluginRegistryUrl: { in: [...LEGACY_PLUGIN_REGISTRY_URLS] },
    },
    data: { pluginRegistryUrl: DEFAULT_PLUGIN_REGISTRY_URL },
  });

  console.log(
    `Updated ${result.count} SystemSetting row(s) to:\n  ${DEFAULT_PLUGIN_REGISTRY_URL}`,
  );

  if (result.count === 0) {
    const current = await prisma.systemSetting.findUnique({
      where: { id: 'GLOBAL_CONFIG' },
      select: { pluginRegistryUrl: true },
    });
    if (current) {
      console.log(`Current registry URL: ${current.pluginRegistryUrl}`);
    } else {
      console.log('No GLOBAL_CONFIG row found (bootstrap on next server start).');
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
