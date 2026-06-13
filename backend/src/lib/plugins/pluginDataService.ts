import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export interface PluginDataApi {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: Prisma.InputJsonValue): Promise<void>;
  delete(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
}

export class PluginDataService implements PluginDataApi {
  constructor(
    private readonly pluginId: string,
    private readonly campaignId: string,
  ) {}

  async get(key: string): Promise<unknown | null> {
    const row = await prisma.pluginData.findUnique({
      where: {
        pluginId_campaignId_key: {
          pluginId: this.pluginId,
          campaignId: this.campaignId,
          key,
        },
      },
    });
    return row?.value ?? null;
  }

  async set(key: string, value: Prisma.InputJsonValue): Promise<void> {
    await prisma.pluginData.upsert({
      where: {
        pluginId_campaignId_key: {
          pluginId: this.pluginId,
          campaignId: this.campaignId,
          key,
        },
      },
      create: {
        pluginId: this.pluginId,
        campaignId: this.campaignId,
        key,
        value,
      },
      update: { value },
    });
  }

  async delete(key: string): Promise<void> {
    await prisma.pluginData.deleteMany({
      where: {
        pluginId: this.pluginId,
        campaignId: this.campaignId,
        key,
      },
    });
  }

  async listKeys(): Promise<string[]> {
    const rows = await prisma.pluginData.findMany({
      where: {
        pluginId: this.pluginId,
        campaignId: this.campaignId,
      },
      select: { key: true },
      orderBy: { key: 'asc' },
    });
    return rows.map((row) => row.key);
  }
}

export function createPluginDataService(
  pluginId: string,
  campaignId: string,
): PluginDataService {
  return new PluginDataService(pluginId, campaignId);
}
