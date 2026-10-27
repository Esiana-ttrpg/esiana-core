// Load application configuration once, then restore explicit isolated fixture settings.
// env.ts intentionally overrides shell values from a developer .env; tests must not use those resources.
const fixture = { ...process.env };
const fs = await import('node:fs/promises');
await fs.mkdir(fixture.UPLOADS_DIR, { recursive: true });
const { env } = await import('../src/config/env.ts');
Object.assign(process.env, fixture);
Object.assign(env, { nodeEnv: 'test', databaseProvider: fixture.DATABASE_PROVIDER, databaseUrl: fixture.DATABASE_URL,
  uploadsDir: fixture.UPLOADS_DIR });
const { createPrismaClient } = await import('../src/lib/createPrismaClient.ts');
const db = createPrismaClient();
await db.user.upsert({ where: { id: 'audio-regression-fixture-user' }, create: {
  id: 'audio-regression-fixture-user', email: 'audio-regression-fixture@example.invalid', displayName: 'Neris',
}, update: {} });
await db.$disconnect();
