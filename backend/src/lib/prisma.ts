import { createPrismaClient } from './createPrismaClient.js';
import type { PrismaClient } from './prismaClient.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export { createPrismaClient } from './createPrismaClient.js';
export type { CreatePrismaClientOptions, DatabaseProvider } from './createPrismaClient.js';

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
